// Force restart to reload new SMTP env variables
import express, { Response, NextFunction, Request } from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import prisma from './prisma.js';
import { z } from 'zod';
import crypto from 'crypto';
import { YooCheckout } from '@a2seven/yoo-checkout';
import nodemailer from 'nodemailer';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 1. Structured Logging Setup (Winston)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    subscription: string;
  };
}

const app = express();
const PORT = process.env.PORT || 3001;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('Startup failed: JWT_SECRET environment variable is missing');
  throw new Error('JWT_SECRET is not defined in environment variables');
}

// 2. Helmet for security headers (highly secure with custom CSP for static assets & dev environments)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allows client to render backend images
  crossOriginEmbedderPolicy: false,                       // Prevents strict Safari/Chrome COEP blocks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://*.yoomoney.ru", "https://*.yookassa.ru", "https://mc.yandex.ru", "https://*.yandex.ru"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:3001", "http://127.0.0.1:3001", "https://*.yoomoney.ru", "https://*.yookassa.ru", "https://mc.yandex.ru", "https://*.yandex.ru"],
      connectSrc: ["'self'", "https:", "http://localhost:3001", "http://127.0.0.1:3001", "https://*.yoomoney.ru", "https://*.yookassa.ru", "https://mc.yandex.ru", "https://*.yandex.ru"],
      frameSrc: ["'self'", "https://*.yoomoney.ru", "https://*.yookassa.ru"],
      upgradeInsecureRequests: []
    }
  }
}));

const allowedOrigins = [
  'https://choozi.ru',
  'http://choozi.ru',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8081',
  'http://127.0.0.1:8081'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow mobile native app requests (which have no Origin header)
    if (!origin) {
      return callback(null, true);
    }
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.startsWith('expo://') || 
                      origin.startsWith('chrome-extension://');
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS'));
    }
  },
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.static('public'));

// Disable caching for all API responses
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// 3. Brute Force Protection (Rate Limiting - bypass or raise limit for local development testing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 10000, // 10k attempts locally, 10 in production
  message: { success: false, error: 'Слишком много попыток, попробуйте позже через 15 минут' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/', authLimiter);

// 4. Authentication Middleware with Auditing
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Auth attempt failed: Token missing', {
      path: req.path,
      ip: req.ip,
      method: req.method
    });
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET as string, (err, decoded) => {
    if (err) {
      logger.warn('Auth attempt failed: Invalid or expired token', {
        error: err.message,
        path: req.path,
        ip: req.ip,
        method: req.method
      });
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = decoded as { id: string; email: string; subscription: string };
    next();
  });
}

// --- EMAIL VERIFICATION HELPERS ---
const createMailTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.yandex.ru';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email: string, code: string) {
  const transporter = createMailTransporter();
  
  if (!transporter) {
    logger.info(`[EMAIL VERIFICATION SANDBOX] =====================================`);
    logger.info(`[EMAIL VERIFICATION SANDBOX] Код подтверждения для ${email}: ${code}`);
    logger.info(`[EMAIL VERIFICATION SANDBOX] =====================================`);
    return;
  }

  const mailOptions = {
    from: `"CHOOZI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Код подтверждения регистрации в CHOOZI 🍳',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 24px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <span style="font-size: 28px;">🍳</span>
          <h2 style="font-size: 20px; font-weight: 900; color: #1e293b; margin: 10px 0 0 0; letter-spacing: -0.025em;">Добро пожаловать в CHOOZI!</h2>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.6; text-align: center;">
          Спасибо за регистрацию. Пожалуйста, подтвердите вашу почту, чтобы получить полный доступ к планировщику меню и шеф-рецептам.
        </p>
        <div style="margin: 30px auto; text-align: center; padding: 20px; border-radius: 20px; border: 1px solid #f1f5f9; background-color: #f8fafc;">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; display: block; margin-bottom: 10px;">Код подтверждения</span>
          <span style="font-size: 32px; font-weight: 900; color: #10b981; letter-spacing: 0.2em; font-family: monospace;">${code}</span>
        </div>
        <p style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 25px; line-height: 1.5;">
          Срок действия кода составляет 15 минут. Если вы не запрашивали это письмо, просто проигнорируйте его.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Verification email sent successfully', { email });
  } catch (error) {
    logger.error('Failed to send verification email via SMTP', { error, email });
  }
}

// --- AUTHENTICATION ROUTES ---

// Register
app.post('/api/auth/register', async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, confirmPassword } = req.body;
  if (!email || !password || !confirmPassword) {
    return res.status(400).json({ success: false, error: 'Пожалуйста, заполните все поля' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, error: 'Пароли не совпадают' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Неверный формат email' });
  }

  // Password strength check
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Пароль должен быть не менее 6 символов' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.isVerified) {
        logger.info('Register rejected: Email already registered and verified', { email, ip: req.ip });
        return res.status(400).json({ success: false, error: 'Пользователь с такой почтой уже зарегистрирован' });
      } else {
        // Allow unverified user to register again (resends code and updates password)
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { email },
          data: { password: hashedPassword }
        });
        
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        
        await prisma.verificationCode.upsert({
          where: { email },
          update: { code, expiresAt },
          create: { email, code, expiresAt }
        });

        sendVerificationEmail(email, code);
        logger.info('User registration updated (unverified retry), verification code resent', { email });
        return res.status(200).json({
          success: true,
          requiresVerification: true,
          email,
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        isVerified: false,
      },
    });

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.verificationCode.upsert({
      where: { email },
      update: { code, expiresAt },
      create: { email, code, expiresAt }
    });

    sendVerificationEmail(email, code);

    logger.info('User registration successful, verification code sent', { userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      requiresVerification: true,
      email,
    });
  } catch (error) {
    logger.error('Registration error details', { error, ip: req.ip });
    res.status(500).json({ success: false, error: 'Ошибка сервера при регистрации' });
  }
});

// Login
app.post('/api/auth/login', async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Неверный email или пароль' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.warn('Login attempt failed: Email not found', { email, ip: req.ip });
      return res.status(400).json({ success: false, error: 'Пользователь с таким email не найден' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logger.warn('Login attempt failed: Incorrect password', { userId: user.id, email, ip: req.ip });
      return res.status(400).json({ success: false, error: 'Неверный пароль' });
    }

    // Check email verification status
    if (!user.isVerified) {
      logger.warn('Login attempt failed: Email unverified', { userId: user.id, email, ip: req.ip });
      return res.status(401).json({
        success: false,
        error: 'EMAIL_UNVERIFIED',
        message: 'Пожалуйста, подтвердите вашу электронную почту'
      });
    }

    const userState = await prisma.userState.findUnique({ where: { userId: user.id } });
    const subscription = userState?.subscription || 'free';

    // Embed subscription level inside JWT payload to fast-path API requests
    const token = jwt.sign(
      { id: user.id, email: user.email, subscription },
      JWT_SECRET as string,
      { expiresIn: '30d' }
    );

    logger.info('User login successful', { userId: user.id, email: user.email });

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    logger.error('Login error details', { error, ip: req.ip });
    res.status(500).json({ success: false, error: 'Ошибка сервера при входе' });
  }
});

// Verify Code
app.post('/api/auth/verify', async (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, error: 'Пожалуйста, укажите email и код' });
  }

  try {
    const dbRecord = await prisma.verificationCode.findUnique({ where: { email } });
    if (!dbRecord || dbRecord.code !== code) {
      return res.status(400).json({ success: false, error: 'Неверный код подтверждения' });
    }

    if (new Date() > dbRecord.expiresAt) {
      return res.status(400).json({ success: false, error: 'Срок действия кода истек' });
    }

    // Update user to verified
    const user = await prisma.user.update({
      where: { email },
      data: { isVerified: true }
    });

    // Delete verification record
    await prisma.verificationCode.delete({ where: { email } });

    // Instantly create default User State on successful verification if it doesn't exist
    let userState = await prisma.userState.findUnique({ where: { userId: user.id } });
    if (!userState) {
      userState = await prisma.userState.create({
        data: {
          userId: user.id,
          preferences: { technique: [], tags: [], dislikedTags: [], difficulty: ['easy', 'medium'] },
          shoppingList: [],
          onboardingComplete: false,
          subscription: 'free'
        }
      });
    }

    const subscription = userState.subscription || 'free';

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, subscription },
      JWT_SECRET as string,
      { expiresIn: '30d' }
    );

    logger.info('User email verified and registered successfully', { userId: user.id, email });

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    logger.error('Verification error details', { error, email });
    res.status(500).json({ success: false, error: 'Ошибка сервера при подтверждении' });
  }
});

// Resend Verification Code
app.post('/api/auth/resend-code', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Пожалуйста, укажите email' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Пользователь не найден' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, error: 'Данная почта уже подтверждена' });
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verificationCode.upsert({
      where: { email },
      update: { code, expiresAt },
      create: { email, code, expiresAt }
    });

    sendVerificationEmail(email, code);

    logger.info('Verification code resent successfully', { email });
    res.json({ success: true, message: 'Код подтверждения отправлен повторно' });
  } catch (error) {
    logger.error('Resend verification code error details', { error, email });
    res.status(500).json({ success: false, error: 'Ошибка сервера при повторной отправке кода' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Fetch the true subscription status from the UserState table
    const userState = await prisma.userState.findUnique({
      where: { userId: user.id },
      select: { subscription: true, subscriptionType: true }
    });

    const subscription = userState?.subscription || 'free';
    const subscriptionType = userState?.subscriptionType || 'month';

    res.json({ 
      success: true, 
      user: {
        ...user,
        subscription,
        subscriptionType
      } 
    });
  } catch (error) {
    logger.error('Profile fetch error details', { error, userId: req.user?.id });
    res.status(500).json({ success: false, error: 'Server error fetching profile' });
  }
});

// 5. Optimized: Decodes token payload and queries DB for registered users to prevent stale session-caching issues
async function getUserSubscription(req: Request): Promise<string> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET as string) as { id?: string; subscription?: string };
      // SECURITY: If we have a registered user ID, fetch the absolute fresh subscription status from the database
      if (decoded && decoded.id) {
        const userState = await prisma.userState.findUnique({ where: { userId: decoded.id } });
        if (userState) {
          return userState.subscription || 'free';
        }
      }
      if (decoded && decoded.subscription) {
        return decoded.subscription;
      }
    } catch (err) {
      // Ignored: Token may have expired, falls back to guest check
    }
  }

  // Fallback to X-User-Id header for guest-synced states ONLY.
  // CRITICAL NOTE: This fallback must only be used for guest-state lookups or public, non-authenticated routes.
  // NEVER use this fallback in authenticated (auth-guarded) routes.
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string') {
    // SECURITY: Guests are allowed to query their own local states only.
    // For registered users, we MUST strictly require authenticated JWT.
    if (!xUserId.startsWith('user_')) {
      logger.warn('Suspicious guest fallback request rejected for registered user ID', { xUserId });
      return 'free';
    }

    try {
      const userState = await prisma.userState.findUnique({ where: { userId: xUserId } });
      if (userState) return userState.subscription || 'free';
    } catch (err) {
      // Ignored
    }
  }

  return 'free';
}

// --- RECIPE ROUTES ---

const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
if (process.env.NODE_ENV === 'production' && BASE_URL.startsWith('http://')) {
  logger.warn('BASE_URL uses http in production environment. Ensure HTTPS is active.');
}

function getFullImageUrl(relativeUrl: string | null): string | null {
  if (!relativeUrl) return null;
  if (relativeUrl.startsWith('http')) return relativeUrl;
  return `${BASE_URL}${relativeUrl}`;
}

// Get All Recipes (with premium data censoring for free users)
app.get('/api/recipes', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 1000; // Default to 1000 to fetch all 133+ recipes fully
    const skip = (page - 1) * limit;

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        skip,
        take: limit,
        include: {
          ingredients: {
            include: {
              ingredient: true
            }
          },
          techniques: {
            include: {
              technique: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          steps: {
            orderBy: {
              stepNum: 'asc'
            }
          }
        }
      }),
      prisma.recipe.count()
    ]);

    const authHeader = req.headers['authorization'];
    const subscription = authHeader ? await getUserSubscription(req) : 'free';
    const isPremiumUser = subscription === 'premium';

    // Censor cooking steps and full ingredients for premium recipes if user is on Free tier
    const safeRecipes = recipes.map(recipe => {
      const tags = recipe.tags.map((t: any) => t.tag.name);
      const isPremiumRecipe = tags.includes('premium');
      const mappedIngredients = recipe.ingredients.map((i: any) => ({
        name: i.ingredient.name,
        quantity: i.quantity,
        isOptional: i.isOptional
      }));
      const mappedSteps = recipe.steps.map((s: any) => s.duration !== null ? [s.text, s.duration] : s.text);

      const preparedRecipe = {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        imageUrl: getFullImageUrl(recipe.imageUrl),
        time: recipe.time,
        difficulty: recipe.difficulty,
        techniqueRequired: recipe.techniques.map((t: any) => t.technique.name),
        tags: tags,
        ingredients: mappedIngredients,
        steps: mappedSteps,
        createdAt: recipe.createdAt
      };

      if (isPremiumRecipe && !isPremiumUser) {
        return {
          ...preparedRecipe,
          steps: ['Этот шаг доступен только по подписке Premium 👑'],
          ingredients: mappedIngredients.map((ing: any) => ({ ...ing, quantity: '🔒' }))
        };
      }
      return preparedRecipe;
    });

    res.json({
      success: true,
      data: safeRecipes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Fetch recipes error details', { error });
    res.status(500).json({ success: false, error: 'Server error fetching recipes' });
  }
});

// Get Specific Recipe by ID (with strict paywall verification)
app.get('/api/recipes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: id as string },
      include: {
        ingredients: {
          include: {
            ingredient: true
          }
        },
        techniques: {
          include: {
            technique: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        },
        steps: {
          orderBy: {
            stepNum: 'asc'
          }
        }
      }
    });

    if (!recipe) {
      return res.status(404).json({ success: false, error: 'Рецепт не найден' });
    }

    const tags = recipe.tags.map((t: any) => t.tag.name);
    const isPremiumRecipe = tags.includes('premium');
    
    // Analytical view metrics log
    logger.info('Recipe view details query', { recipeId: id, title: recipe.title, isPremiumRecipe });

    if (isPremiumRecipe) {
      const subscription = await getUserSubscription(req);
      if (subscription !== 'premium') {
        logger.warn('Premium recipe access blocked (conversion potential)', {
          recipeId: id,
          title: recipe.title,
          userId: req.headers['x-user-id'] || 'guest'
        });

        return res.status(403).json({
          success: false,
          error: 'Premium Access Required',
          message: 'Этот рецепт доступен только подписчикам CHOOZI Premium.'
        });
      }
    }

    const preparedRecipe = {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      imageUrl: getFullImageUrl(recipe.imageUrl),
      time: recipe.time,
      difficulty: recipe.difficulty,
      techniqueRequired: recipe.techniques.map((t: any) => t.technique.name),
      tags: tags,
      ingredients: recipe.ingredients.map((i: any) => ({
        name: i.ingredient.name,
        quantity: i.quantity,
        isOptional: i.isOptional
      })),
      steps: recipe.steps.map((s: any) => s.duration !== null ? [s.text, s.duration] : s.text),
      createdAt: recipe.createdAt
    };
    res.json({ success: true, data: preparedRecipe });
  } catch (error) {
    logger.error('Fetch recipe details error details', { error, id });
    res.status(500).json({ success: false, error: 'Server error fetching recipe details' });
  }
});

// Middleware to check authentication for registered users or allow guest access
function verifyUserOrGuest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.params.userId as string | undefined;
  const isGuest = userId && userId.startsWith('user_');

  if (isGuest) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('Unauthenticated access blocked to user state', { userId, ip: req.ip });
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET as string, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = decoded as { id: string; email: string; subscription: string };
    
    if (req.user.id !== userId) {
      logger.warn('Unauthorized attempt to access another user\'s state', {
        userId,
        authenticatedId: req.user.id,
        ip: req.ip
      });
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    next();
  });
}

// Zod validation schemas for User State
const preferencesSchema = z.object({
  technique: z.array(z.string()).max(20).default([]),
  tags: z.array(z.string()).max(50).default([]),
  dislikedTags: z.array(z.string()).max(50).default([]),
  difficulty: z.array(z.enum(['easy', 'medium', 'hard'])).default(['easy', 'medium']),
  autoRenew: z.boolean().optional().default(true),
  subscriptionType: z.enum(['month', 'year']).optional().default('year'),
});

const shoppingItemSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  isChecked: z.boolean().default(false),
  recipeId: z.string().nullable().optional(),
  recipeTitle: z.string().max(200).nullable().optional(),
});

// --- USER STATE ROUTES ---

// Get User State (Upsert / Returns default if not found)
app.get('/api/user-state/:userId', verifyUserOrGuest, async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;

  try {
    let state = await prisma.userState.findUnique({ where: { userId: userId as string } });
    if (!state) {
      state = await prisma.userState.create({
        data: {
          userId: userId as string,
          preferences: { technique: [], tags: [], dislikedTags: [], difficulty: ['easy', 'medium'] },
          shoppingList: [],
          onboardingComplete: false,
          subscription: 'free',
        },
      });
    }

    res.json({
      success: true,
      data: {
        userId: state.userId,
        preferences: {
          ...(state.preferences as any || {}),
          autoRenew: state.autoRenew,
          subscriptionType: state.subscriptionType || 'month'
        },
        shoppingList: state.shoppingList,
        onboardingComplete: state.onboardingComplete,
        subscription: state.subscription,
      },
    });
  } catch (error) {
    logger.error('Fetch user state error details', { error, userId });
    res.status(500).json({ success: false, error: 'Server error fetching user state' });
  }
});

// Upsert User State (and regenerate token dynamically when subscription level changes)
app.post('/api/user-state/:userId', verifyUserOrGuest, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.userId as string;

  try {
    // 1. Zod input validation
    const preferences = preferencesSchema.parse(req.body.preferences || {});
    const shoppingList = z.array(shoppingItemSchema).max(500).parse(req.body.shoppingList || []);
    const onboardingComplete = z.boolean().default(false).parse(req.body.onboardingComplete);
    const clientSubscription = z.string().optional().parse(req.body.subscription);

    const isGuest = userId.startsWith('user_');

    // Prevent guest from upgrading subscription level
    const ALLOWED_GUEST_SUBSCRIPTIONS = ['free'];
    if (isGuest && clientSubscription && !ALLOWED_GUEST_SUBSCRIPTIONS.includes(clientSubscription)) {
      logger.warn('Attempted to upgrade guest subscription level blocked', { userId, clientSubscription });
      return res.status(403).json({ success: false, error: 'Cannot upgrade guest subscription' });
    }

    // 2. Secure subscription level & type: single source of truth is the database
    const existingState = await prisma.userState.findUnique({ where: { userId } });
    const dbSubscription = existingState?.subscription || 'free';
    const dbSubscriptionType = existingState?.subscriptionType || null;

    // Synchronize autoRenew database column from preferences JSON
    const autoRenewFlag = preferences.autoRenew !== false;

    const updatedState = await prisma.userState.upsert({
      where: { userId: userId as string },
      update: {
        preferences: preferences ?? {},
        shoppingList: shoppingList ?? [],
        onboardingComplete: onboardingComplete ?? false,
        subscription: dbSubscription,
        subscriptionType: dbSubscriptionType,
        autoRenew: autoRenewFlag,
        // Physically clear card token when auto-renew is disabled
        yookassaPaymentMethodId: autoRenewFlag ? undefined : null
      },
      create: {
        userId: userId as string,
        preferences: preferences ?? {},
        shoppingList: shoppingList ?? [],
        onboardingComplete: onboardingComplete ?? false,
        subscription: dbSubscription,
        subscriptionType: dbSubscriptionType,
        autoRenew: autoRenewFlag,
        yookassaPaymentMethodId: autoRenewFlag ? undefined : null
      },
    });

    let newToken: string | undefined = undefined;
    // When upgrading subscription level, sign a new token so that the user's local state matches instantly
    const subscriptionChanged = updatedState.subscription !== req.user?.subscription;
    if (!isGuest && subscriptionChanged) {
      const user = await prisma.user.findUnique({ where: { id: userId as string } });
      if (user) {
        newToken = jwt.sign(
          { id: user.id, email: user.email, subscription: updatedState.subscription },
          JWT_SECRET as string,
          { expiresIn: '30d' }
        );
      }
    }

    res.json({ 
      success: true, 
      data: {
        userId: updatedState.userId,
        preferences: {
          ...(updatedState.preferences as any || {}),
          autoRenew: updatedState.autoRenew,
          subscriptionType: updatedState.subscriptionType || 'month'
        },
        shoppingList: updatedState.shoppingList,
        onboardingComplete: updatedState.onboardingComplete,
        subscription: updatedState.subscription, // Returns read-only actual db value
      },
      token: newToken
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid user-state format rejected', { userId, errors: (error as any).errors });
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
        details: (error as any).errors
      });
    }
    logger.error('Save user state error details', { error, userId });
    res.status(500).json({ success: false, error: 'Server error saving user state' });
  }
});

// --- YOOKASSA PAYMENTS ROUTING ---

// Create payment session / link for YooKassa
app.post('/api/payments/create-session', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { tier } = req.body;
  if (tier !== 'month' && tier !== 'year') {
    return res.status(400).json({ success: false, error: 'Неверный тариф подписки' });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Пользователь не авторизован' });
  }

  const amount = tier === 'month' ? 119 : 999;
  const description = tier === 'month' ? 'Подписка CHOOZI Premium на 1 месяц' : 'Подписка CHOOZI Premium на 1 год';
  
  const shopId = process.env.YOOKASSA_SHOP_ID || '1374499';
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!secretKey) {
    logger.error('YooKassa configuration error: Secret key is missing');
    return res.status(500).json({ success: false, error: 'Ошибка платежного шлюза. Обратитесь в поддержку.' });
  }

  // Determine host for redirect return URL back to the client
  const origin = req.headers.origin || 'https://choozi.ru';
  const returnUrl = `${origin}/profile?yookassa=success`;

  // Initialize the SDK
  const checkout = new YooCheckout({ shopId, secretKey });

  // YooKassa requires an Idempotence-Key header for POST requests
  const idempotencyKey = crypto.randomUUID();

  try {
    let payment;
    try {
      payment = await checkout.createPayment({
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB'
        },
        capture: true,
        save_payment_method: true,
        confirmation: {
          type: 'redirect',
          return_url: returnUrl
        },
        description: description,
        metadata: {
          userId,
          tier
        }
      }, idempotencyKey);
    } catch (sdkError: any) {
      logger.warn('YooKassa payment creation with save_payment_method failed, trying fallback without card saving...', { 
        userId, 
        tier, 
        error: sdkError.message || sdkError 
      });

      // Generate a new idempotency key for the fallback retry to prevent conflicts
      const fallbackIdempotencyKey = crypto.randomUUID();

      payment = await checkout.createPayment({
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB'
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: returnUrl
        },
        description: description,
        metadata: {
          userId,
          tier
        }
      }, fallbackIdempotencyKey);
    }

    logger.info('YooKassa payment session generated successfully via SDK', { userId, tier, paymentId: payment.id });

    const paymentUrl = payment.confirmation?.confirmation_url;
    if (!paymentUrl) {
      logger.error('YooKassa API response missing confirmation_url', { payment });
      return res.status(500).json({ success: false, error: 'Не удалось получить ссылку на оплату от ЮKassa' });
    }

    // In local development, simulate a successful payment after 2 seconds
    // to bypass local network isolation (since YooKassa cannot reach localhost)
    const isLocalDev = process.env.NODE_ENV === 'development' || 
                       (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1')));
    if (isLocalDev) {
      setTimeout(async () => {
        try {
          logger.info('[DEV] Simulating successful payment callback for user', { userId, tier });
          const durationMs = tier === 'year' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
          const expiresAt = new Date(Date.now() + durationMs);
          
          await prisma.userState.upsert({
            where: { userId },
            update: { 
              subscription: 'premium',
              subscriptionType: tier === 'year' ? 'year' : 'month',
              subscriptionExpiresAt: expiresAt,
              autoRenew: true,
              preferences: {
                autoRenew: true,
                subscriptionType: tier === 'year' ? 'year' : 'month'
              } as any
            },
            create: {
              userId,
              preferences: {
                technique: [],
                tags: [],
                dislikedTags: [],
                difficulty: ['easy', 'medium'],
                autoRenew: true,
                subscriptionType: tier === 'year' ? 'year' : 'month'
              },
              shoppingList: [],
              subscription: 'premium',
              subscriptionType: tier === 'year' ? 'year' : 'month',
              subscriptionExpiresAt: expiresAt,
              autoRenew: true
            }
          });
          logger.info('[DEV] Simulated callback completed successfully');
        } catch (e) {
          logger.error('[DEV] Failed to simulate callback:', e);
        }
      }, 2000);
    }

    res.json({ success: true, paymentUrl });
  } catch (error) {
    logger.error('Error creating YooKassa session via SDK', { error });
    res.status(500).json({ success: false, error: 'Ошибка подключения к ЮKassa' });
  }
});

// Cron renewal endpoint to automatically renew expired subscriptions using saved YooKassa payment card methods
app.post('/api/subscriptions/renew', async (req: Request, res: Response) => {
  const cronSecret = process.env.CRON_SECRET;
  const clientSecret = req.headers['x-cron-secret'];

  // Security layer: If CRON_SECRET environment variable is defined, require client header to match it
  if (cronSecret && clientSecret !== cronSecret) {
    logger.warn('Unauthorized subscription renewal attempt blocked: Secret token mismatch', { clientSecret });
    return res.status(401).json({ success: false, error: 'Несанкционированный доступ' });
  }

  const shopId = process.env.YOOKASSA_SHOP_ID || '1374499';
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!secretKey) {
    logger.error('YooKassa configuration error in cron renewal: Secret key is missing');
    return res.status(500).json({ success: false, error: 'Конфигурация сервера не настроена' });
  }

  const checkout = new YooCheckout({ shopId, secretKey });

  try {
    // Find all users whose premium subscription has expired (or expires in the next 1 hour)
    // and who have auto-renewal enabled and a saved card payment method.
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    const expiringUsers = await prisma.userState.findMany({
      where: {
        subscription: 'premium',
        autoRenew: true,
        yookassaPaymentMethodId: {
          not: null
        },
        subscriptionExpiresAt: {
          lte: oneHourFromNow
        }
      }
    });

    logger.info(`Subscription auto-renewal cron process started. Found ${expiringUsers.length} users to process.`);
    const results = [];

    for (const userState of expiringUsers) {
      const { userId, subscriptionType, yookassaPaymentMethodId } = userState;
      const amount = subscriptionType === 'year' ? 999 : 119;
      const description = subscriptionType === 'year' 
        ? 'Автопродление подписки CHOOZI Premium на 1 год' 
        : 'Автопродление подписки CHOOZI Premium на 1 месяц';

      const idempotencyKey = crypto.randomUUID();

      try {
        logger.info(`Initiating auto-renewal payment via YooKassa for user`, { userId, amount, subscriptionType });

        const payment = await checkout.createPayment({
          amount: {
            value: amount.toFixed(2),
            currency: 'RUB'
          },
          capture: true,
          payment_method_id: yookassaPaymentMethodId!,
          description: description,
          metadata: {
            userId,
            tier: subscriptionType || 'month',
            isAutoRenewal: 'true'
          }
        }, idempotencyKey);

        if (payment.status === 'succeeded') {
          // Calculate new subscription expiration date
          const durationMs = subscriptionType === 'year' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
          const newExpiresAt = new Date(Date.now() + durationMs);

          // Update user subscription in database
          await prisma.userState.update({
            where: { userId },
            data: {
              subscription: 'premium',
              subscriptionExpiresAt: newExpiresAt
            }
          });

          logger.info(`Successful subscription auto-renewal completed for user`, { userId, paymentId: payment.id, newExpiresAt });
          results.push({ userId, success: true, paymentId: payment.id });
        } else {
          // Payment is pending or failed (e.g. requires 3DS or is declined)
          logger.warn(`Auto-renewal charge failed/declined for user`, { userId, paymentStatus: payment.status });
          
          // Revoke premium access and disable autoRenew
          await prisma.userState.update({
            where: { userId },
            data: {
              subscription: 'free',
              autoRenew: false
            }
          });

          results.push({ userId, success: false, reason: `payment_${payment.status}` });
        }
      } catch (err: any) {
        logger.error(`Error processing auto-renewal payment for user`, { userId, error: err.message || err });
        
        // Revoke premium access on error (e.g. card declined or network error)
        await prisma.userState.update({
          where: { userId },
          data: {
            subscription: 'free',
            autoRenew: false
          }
        });

        results.push({ userId, success: false, reason: 'error_processing_payment' });
      }
    }

    res.json({ success: true, processed: expiringUsers.length, results });
  } catch (error: any) {
    logger.error('Fatal error in subscription auto-renewal cron process', { error: error.message || error });
    res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
  }
});

// YooKassa Callback / Webhook Handler
app.post('/api/payments/callback', async (req: Request, res: Response) => {
  const { event, object } = req.body;

  logger.info('Received YooKassa callback request', { event, paymentId: object?.id });

  if (!event || !object || !object.id) {
    logger.warn('YooKassa callback failed: Missing required parameters', { body: req.body });
    return res.status(400).send('Bad Request');
  }

  const shopId = process.env.YOOKASSA_SHOP_ID || '1374499';
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!secretKey) {
    logger.error('YooKassa configuration error in callback: secret key is missing');
    return res.status(500).send('Server configuration error');
  }

  // Initialize the SDK
  const checkout = new YooCheckout({ shopId, secretKey });

  try {
    // 1. Fetch authentic payment data from YooKassa API via SDK to verify authenticity and avoid spoofing
    const verifiedPayment = await checkout.getPayment(object.id);
    const { status, metadata } = verifiedPayment;
    const userId = metadata?.userId;
    const tier = metadata?.tier;

    if (!userId || !tier) {
      logger.warn('Verified payment object lacks metadata', { verifiedPayment });
      return res.status(400).send('Missing Metadata');
    }

    // 2. Handle events based on verified statuses
    if (event === 'payment.succeeded' && status === 'succeeded') {
      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        logger.warn('YooKassa payment succeeded but user not found in database', { userId });
        return res.status(404).send('User Not Found');
      }

      const existingState = await prisma.userState.findUnique({ where: { userId } });
      const currentPrefs = existingState?.preferences as any || {};

      // Extract payment method details
      const paymentMethodId = verifiedPayment.payment_method?.id;
      const isSaved = verifiedPayment.payment_method?.saved;

      // Calculate subscription expiration date (30 days for month, 365 for year)
      const durationMs = tier === 'year' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + durationMs);

      // Upgrade user to Premium in database
      await prisma.userState.upsert({
        where: { userId },
        update: { 
          subscription: 'premium',
          subscriptionType: tier === 'year' ? 'year' : 'month',
          subscriptionExpiresAt: expiresAt,
          yookassaPaymentMethodId: isSaved && paymentMethodId ? paymentMethodId : undefined,
          autoRenew: true,
          preferences: {
            ...currentPrefs,
            autoRenew: true,
            subscriptionType: tier === 'year' ? 'year' : 'month'
          }
        },
        create: {
          userId,
          preferences: {
            technique: [],
            tags: [],
            dislikedTags: [],
            difficulty: ['easy', 'medium'],
            autoRenew: true,
            subscriptionType: tier === 'year' ? 'year' : 'month'
          },
          shoppingList: [],
          onboardingComplete: true,
          subscription: 'premium',
          subscriptionType: tier === 'year' ? 'year' : 'month',
          subscriptionExpiresAt: expiresAt,
          yookassaPaymentMethodId: isSaved && paymentMethodId ? paymentMethodId : undefined,
          autoRenew: true
        }
      });

      logger.info('YooKassa payment verified successfully. User upgraded to Premium with auto-renew card token saved.', {
        userId,
        tier,
        paymentId: object.id,
        paymentMethodId: isSaved ? paymentMethodId : 'none',
        expiresAt: expiresAt.toISOString(),
        amount: verifiedPayment.amount?.value
      });

    } else if (event === 'payment.canceled' && status === 'canceled') {
      logger.info('YooKassa payment was canceled by customer or gateway', { userId, tier, paymentId: object.id });

    } else if (event === 'refund.succeeded') {
      // If payment was refunded, revoke the premium status
      await prisma.userState.upsert({
        where: { userId },
        update: { subscription: 'free' },
        create: {
          userId,
          preferences: {},
          shoppingList: [],
          onboardingComplete: true,
          subscription: 'free'
        }
      });

      logger.info('YooKassa refund succeeded. User subscription revoked to free.', {
        userId,
        paymentId: object.id
      });
    }

    // Return 200 OK as required by YooKassa to confirm event delivery
    return res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing YooKassa payment callback', { error, paymentId: object.id });
    return res.status(500).send('Internal Error');
  }
});

// 6. Production unhandled error middleware handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled server error details', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({ 
    success: false, 
    error: 'Внутренняя ошибка сервера' 
  });
});

// Bootstrap startup loader: connect DB before opening server listener ports
async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('Database connection established successfully');

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to bootstrap server initialization', { error });
    process.exit(1);
  }
}

bootstrap();
