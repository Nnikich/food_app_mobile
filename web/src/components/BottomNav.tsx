import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingCart, User, Calendar, LucideIcon } from 'lucide-react';

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

export default function BottomNav() {
    const navItems: NavItem[] = [
        { path: '/', icon: Home, label: 'Главная' },
        { path: '/catalog', icon: Search, label: 'Каталог' },
        { path: '/planner', icon: Calendar, label: 'Меню' },
        { path: '/shopping', icon: ShoppingCart, label: 'Покупки' },
        { path: '/profile', icon: User, label: 'Профиль' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/90 backdrop-blur-xl z-50 pb-safe">
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
                            }`
                        }
                    >
                        <item.icon size={24} strokeWidth={2} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </div>
    );
}
