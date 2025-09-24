'use client';

// import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiMenu, FiX, FiMoon, FiSun, FiGlobe } from 'react-icons/fi';
import { useTheme } from 'next-themes';
import { useTranslations, useLocale } from 'next-intl';
import LoginButton from '@/components/auth/LoginButton';

const Navbar: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('navigation');

  // Empty navigation items - add your own
  const navItems: { label: string; path: string; }[] = [
    { label: 'Wallet', path: "/wallet" },
  ];

  // Language options
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' }
  ];

  useEffect(() => setMounted(true), []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleLangMenu = () => setShowLangMenu(!showLangMenu);
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const isLinkActive = (path: string) => {
    const currentPath = pathname.replace(/\/$/, '');
    const normalizedPath = path.replace(/\/$/, '');
    return currentPath === `/${locale}${normalizedPath}` ||
      (path === '/' && currentPath === `/${locale}`);
  };

  const currentLang = languages.find(lang => lang.code === locale) || languages[0];

  const getMotivationalMessage = () => {
    const messages = locale === 'fr' ? [
      "Créez un CV qui vous distingue",
      "Votre prochain emploi vous attend",
      "Mettez en valeur vos compétences",
      "Construisez votre avenir professionnel",
      "Chaque expérience compte",
      "Transformez vos idées en opportunités"
    ] : [
      "Craft a CV that stands out",
      "Your next opportunity awaits",
      "Showcase your unique skills",
      "Build your professional future",
      "Every experience matters",
      "Transform your ideas into opportunities"
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">

        <div className="flex items-center">
          <span className="text-sm text-muted-foreground italic">
            {getMotivationalMessage()}
          </span>
        </div>


        {/* Logo */}
        {/* <div className="flex items-center"> */}
        {/*   <Link */}
        {/*     href={`/${locale}`} */}
        {/*     className="flex items-center" */}
        {/*   > */}
        {/*     <Image */}
        {/*       src="/logo.png" */}
        {/*       alt="cVenom" */}
        {/*       width={58} */}
        {/*       height={58} */}
        {/*       className="w-10 h-10" */}
        {/*     /> */}
        {/*   </Link> */}
        {/* </div> */}

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={`/${locale}${item.path}`}
              className={`text-sm font-medium transition-colors hover:text-primary ${isLinkActive(item.path) ? "text-primary" : "text-foreground"
                }`}
            >
              {item.label}
            </Link>
          ))}

          <div className="flex items-center space-x-3">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={toggleLangMenu}
                className="rounded-full p-2 bg-secondary hover:bg-secondary/80 transition-colors flex items-center"
                aria-label={t('toggle_language')}
              >
                <FiGlobe className="h-5 w-5 mr-1" />
                <span className="text-sm font-medium">{currentLang.code.toUpperCase()}</span>
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-background border border-border rounded-lg shadow-lg py-1 z-50">
                  {languages.map((lang) => (
                    <Link
                      key={lang.code}
                      href={pathname.replace(/^\/[a-z]{2}/, `/${lang.code}`)}
                      className={`flex items-center px-3 py-2 text-sm hover:bg-secondary transition-colors ${locale === lang.code ? 'bg-secondary text-primary' : 'text-foreground'
                        }`}
                      onClick={() => setShowLangMenu(false)}
                    >
                      <span className="mr-2 text-xs font-mono">{lang.code.toUpperCase()}</span>
                      {lang.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 bg-secondary hover:bg-secondary/80 transition-colors"
              aria-label={t('toggle_theme')}
            >
              {mounted && theme === 'dark' ? (
                <FiSun className="h-5 w-5" />
              ) : (
                <FiMoon className="h-5 w-5" />
              )}
            </button>

            {/* Login Button */}
            <LoginButton />
          </div>
        </nav>

        {/* Mobile Navigation Toggle */}
        <div className="flex md:hidden items-center space-x-2">
          {/* Mobile Login Button */}
          <LoginButton />

          {/* Mobile Language Switcher */}
          <div className="relative">
            <button
              onClick={toggleLangMenu}
              className="rounded-full p-2 bg-secondary hover:bg-secondary/80 transition-colors flex items-center"
              aria-label={t('toggle_language')}
            >
              <FiGlobe className="h-5 w-5 mr-1" />
              <span className="text-xs font-medium">{currentLang.code.toUpperCase()}</span>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-background border border-border rounded-lg shadow-lg py-1 z-50">
                {languages.map((lang) => (
                  <Link
                    key={lang.code}
                    href={pathname.replace(/^\/[a-z]{2}/, `/${lang.code}`)}
                    className={`flex items-center px-3 py-2 text-sm hover:bg-secondary transition-colors ${locale === lang.code ? 'bg-secondary text-primary' : 'text-foreground'
                      }`}
                    onClick={() => setShowLangMenu(false)}
                  >
                    <span className="mr-2 text-xs font-mono">{lang.code.toUpperCase()}</span>
                    {lang.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label={t('toggle_theme')}
          >
            {mounted && theme === 'dark' ? (
              <FiSun className="h-5 w-5" />
            ) : (
              <FiMoon className="h-5 w-5" />
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleMenu}
            className="p-2 rounded-md text-foreground"
            aria-label={t('toggle_menu')}
          >
            {isOpen ? (
              <FiX className="h-6 w-6" />
            ) : (
              <FiMenu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="container py-4 space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={`/${locale}${item.path}`}
                className={`block px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${isLinkActive(item.path) ? "text-primary" : "text-foreground"
                  }`}
                onClick={toggleMenu}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
