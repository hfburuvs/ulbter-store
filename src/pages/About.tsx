import { useState, useEffect } from "react";
import { Shield, Eye, Smartphone, Award, Users, Zap } from "lucide-react";
import { Link } from "react-router";
import { useCountry } from "@/hooks/useCountry";
import { supabase } from "@/lib/supabase";

export default function About() {
  const { t, path, country } = useCountry();
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from("settings").select("*");
        const map: Record<string, string> = {};
        (data || []).forEach((s: any) => { map[s.key] = s.value; });
        setSettingsMap(map);
      } catch (e) { /* ignore */ }
    }
    load();
  }, []);

  const c = (key: string) => {
    if (country === "us") return settingsMap[key] || t(key);
    return t(key);
  };

  const features = [
    { icon: Shield, titleKey: "aboutFeature1", descKey: "aboutFeature1Desc" },
    { icon: Eye, titleKey: "aboutFeature2", descKey: "aboutFeature2Desc" },
    { icon: Smartphone, titleKey: "aboutFeature3", descKey: "aboutFeature3Desc" },
    { icon: Zap, titleKey: "aboutFeature4", descKey: "aboutFeature4Desc" },
    { icon: Award, titleKey: "aboutFeature5", descKey: "aboutFeature5Desc" },
    { icon: Users, titleKey: "aboutFeature6", descKey: "aboutFeature6Desc" },
  ];

  return (
    <div>
      {/* Hero Banner */}
      <section className="hero-pattern py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
            {t("aboutUs") || "About Us"}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            {c("aboutTitle")} <span className="text-brand-600">ulbter</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {c("aboutHero")}
          </p>
        </div>
      </section>

      {/* Brand Story */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              {c("aboutSubtitle")} <span className="text-brand-600">9H Films</span>
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>{c("aboutStory")}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-brand-600/10 to-brand-100 rounded-2xl p-8 text-center">
            <div className="text-6xl font-black text-brand-600 mb-2">ulbter</div>
            <div className="text-xl font-bold text-gray-900 mb-4">Precision Armor</div>
            <div className="text-lg text-gray-600 italic">Unstoppable Clarity</div>
            <div className="mt-6 flex justify-center gap-4">
              <Shield className="w-8 h-8 text-brand-600" />
              <Eye className="w-8 h-8 text-brand-600" />
              <Smartphone className="w-8 h-8 text-brand-600" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {c("aboutWhyTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-black/[0.08] p-6 hover:shadow-md transition-shadow">
                <f.icon className="w-10 h-10 text-brand-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(f.titleKey)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(f.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          {c("aboutCommitment")}
        </h2>
        <div className="max-w-3xl mx-auto text-gray-600 leading-relaxed text-center">
          <p>{c("aboutCommitmentText")}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="hero-pattern py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {c("aboutCTA")}
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
            {c("aboutCTADesc")}
          </p>
          <Link to={path("/")} className="btn-primary text-white text-lg font-semibold py-3 px-8 rounded-full transition-all inline-block">
            {t("aboutShopNow")}
          </Link>
        </div>
      </section>
    </div>
  );
}
