import React from 'react';
import { createPortal } from 'react-dom';

// --- Card ---
// Removed overflow-hidden to allow dropdowns (autocomplete) to be visible outside the card
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; icon?: React.ReactNode }> = ({ children, className = "", title, icon }) => (
  <div className={`bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 ${className}`}>
    {title && (
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
        {icon && <span className="text-indigo-400">{icon}</span>}
        <h3 className="font-semibold text-slate-200 text-sm tracking-wide">{title}</h3>
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', size = 'md', loading, className = "", disabled, ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg active:scale-95";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 focus:ring-indigo-500 border border-transparent",
    secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 focus:ring-slate-500",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 focus:ring-red-500",
    ghost: "bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus:ring-slate-500",
    outline: "bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 focus:ring-slate-500",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2.5",
    lg: "text-base px-6 py-3.5",
    icon: "p-2.5",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} 
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, error, icon, rightElement, className = "", ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>}
    <div className="relative group">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        className={`w-full bg-slate-900 text-slate-100 rounded-lg border border-slate-700 shadow-sm placeholder-slate-500 
          focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 
          sm:text-sm py-2.5 transition-all
          ${icon ? 'pl-10' : 'pl-3'} 
          ${rightElement ? 'pr-10' : 'pr-3'}
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} 
          ${className}`}
        {...props}
      />
      {rightElement && (
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
          {rightElement}
        </div>
      )}
    </div>
    {error && <p className="mt-1.5 text-xs text-red-400 animate-pulse">{error}</p>}
  </div>
));
Input.displayName = "Input";

// --- Modal ---
// Updated to use Portal to break out of transform stacking contexts
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header - Fixed */}
        <div className="px-6 py-4 border-b border-slate-800 shrink-0 flex justify-between items-center">
           <h3 className="text-lg font-semibold leading-6 text-white">{title}</h3>
           <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
             <span className="sr-only">Cerrar</span>
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        {/* Content - Scrollable */}
        <div className="px-6 py-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>

      </div>
    </div>,
    document.body
  );
};