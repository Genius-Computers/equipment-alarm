"use client";
import { Globe, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@stackframe/stack";

const Header = () => {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const user = useUser();
  const role = (user?.clientReadOnlyMetadata?.role) as string | undefined;
  
  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex md:flex-row flex-col md:gap-0 gap-2 md:items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Image src={'/logo.png'} width={70} height={70} alt="logo" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{t("header.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("header.subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center md:justify-normal justify-between gap-2 md:gap-4">
            {/* Language toggle: icon-only on mobile, text on md+ */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleLanguage}
              className="md:hidden"
              aria-label={t("language.switch")}
            >
              <Globe className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="hidden md:flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              {t("language.switch")}
            </Button>

            {/* Admin Users: icon-only on mobile, text on md+ */}
            {role === 'admin' ? (
              <>
                <Link href="/users" className="inline-flex md:hidden" aria-label={t("users.title")}>
                  <Button variant="outline" size="icon">
                    <Users className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/users" className="hidden md:inline-flex">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t("users.title")}
                  </Button>
                </Link>
              </>
            ) : null}

            {/* Sign out: show when logged-in; icon-only on mobile, text on md+ */}
            {user ? (
              <>
                <Link href="/handler/sign-out" className="inline-flex md:hidden" aria-label={t("auth.signOut")}>
                  <Button variant="outline" size="icon">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/handler/sign-out" className="hidden md:inline-flex">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    {t("auth.signOut")}
                  </Button>
                </Link>
              </>
            ) : null}
            <div className={`text-right ${isRTL ? "text-left" : "text-right"}`}>
              <p className="text-sm font-medium text-foreground">{t("header.department")}</p>
              <p className="text-xs text-muted-foreground">{t("header.facility")}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;