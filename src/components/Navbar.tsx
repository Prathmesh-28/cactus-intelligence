import { Link, useNavigate } from 'react-router-dom';
import { LogOut, History, Search, Shield, UserCircle } from 'lucide-react';
import { CactusLogo } from './CactusLogo';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  breadcrumb?: string;
}

export function Navbar({ breadcrumb }: NavbarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#1C3B2E] border-b border-[#2E6B4F]/40">
      <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-4">
          <Link to="/"><CactusLogo size="sm" inverted /></Link>
          {breadcrumb && (
            <>
              <span className="text-[#4A7C5F] text-sm">/</span>
              <span className="text-[#A8C4B0] text-sm font-medium truncate max-w-[200px]">{breadcrumb}</span>
            </>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-1">
            <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#A8C4B0] hover:text-white hover:bg-white/10 rounded transition-colors">
              <Search size={14} /><span className="hidden sm:inline">Search</span>
            </Link>
            <Link to="/history" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#A8C4B0] hover:text-white hover:bg-white/10 rounded transition-colors">
              <History size={14} /><span className="hidden sm:inline">History</span>
            </Link>
            {user.role === 'admin' && (
              <Link to="/admin" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#A8C4B0] hover:text-white hover:bg-white/10 rounded transition-colors">
                <Shield size={14} /><span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <div className="w-px h-4 bg-[#2E6B4F] mx-1" />
            <Link to="/profile" className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-[#A8C4B0] hover:text-white hover:bg-white/10 rounded transition-colors">
              <div className="w-6 h-6 rounded-full bg-[#2E6B4F] flex items-center justify-center text-xs font-bold text-white">
                {(user.name ?? user.email)[0].toUpperCase()}
              </div>
              <span className="hidden md:inline max-w-[140px] truncate text-xs">{user.name ?? user.email}</span>
              {user.role === 'admin' && (
                <span className="text-[10px] px-1.5 py-0.5 bg-[#3D9970]/20 text-[#3D9970] rounded-full font-medium">Admin</span>
              )}
            </Link>
            <Link to="/profile" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#A8C4B0] hover:text-white hover:bg-white/10 rounded transition-colors sm:hidden" title="Profile">
              <UserCircle size={14} />
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#A8C4B0] hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
