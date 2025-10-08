"use client";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import Image from "next/image";
import Link from "next/link";
import { useSelfProfile } from "@/hooks/useSelfProfile";

const Header = () => {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { profile } = useSelfProfile();
  
  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  const getRoleDisplay = (role?: string) => {
    if (!role) return "";
    switch (role) {
      case "admin":
        return "Admin";
      case "supervisor":
        return "Supervisor";
      case "technician":
        return "Technician";
      case "end_user":
        return "End User";
      default:
        return role;
    }
  };

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex md:flex-row flex-col md:gap-0 gap-2 md:items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
              <Image src={'/logo.png'} width={70} height={70} alt="logo" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{t("header.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("header.subtitle")}</p>
            </div>
          </Link>
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
            <div className={`text-right ${isRTL ? "text-left" : "text-right"}`}>
              <p className="text-sm font-medium text-foreground">
                {profile?.displayName || profile?.email || "User"}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {getRoleDisplay(profile?.role)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;