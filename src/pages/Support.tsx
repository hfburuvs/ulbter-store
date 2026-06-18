import { supabase } from "@/lib/supabase";
import {
  Mail, User, MessageSquare, Send, Check, AlertCircle, Clock, Briefcase,
  Store, ExternalLink, Video, Download, BookOpen, HelpCircle, ChevronDown, Globe
} from "lucide-react";
import { useState, useEffect } from "react";
import { useCountry } from "@/hooks/useCountry";

interface StoreLink {
  id: number;
  country_code: string;
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface InstallationGuide {
  id: number;
  category_id: number;
  video_url: string;
  manual_url: string;
  sort_order: number;
  is_active: boolean;
  title: string;
}

export default function Support() {
  const { t, country } = useCountry();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [subscribe, setSubscribe] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});

  // Store links
  const [storeLinks, setStoreLinks] = useState<StoreLink[]>([]);
  // Categories + guides
  const [categories, setCategories] = useState<Category[]>([]);
  const [guides, setGuides] = useState<InstallationGuide[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const { data: settingsData } = await supabase.from("settings").select("*");
        const map: Record<string, string> = {};
        (settingsData || []).forEach((s: any) => { map[s.key] = s.value; });
        setSettingsMap(map);
        if (map["contactEmail"]) setContactEmail(map["contactEmail"]);

        // Load store links
        const { data: linksData } = await supabase
          .from("store_links")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        setStoreLinks(linksData || []);

        // Load categories
        const { data: catsData } = await supabase
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true });
        setCategories(catsData || []);

        // Load installation guides
        const { data: guidesData } = await supabase
          .from("installation_guides")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        setGuides(guidesData || []);
      } catch (e) { /* ignore */ }
    }
    load();
  }, []);

  const c = (key: string) => {
    if (country === "us") return settingsMap[key] || t(key);
    return t(key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !content.trim()) {
      setError(c("contactRequiredError"));
      return;
    }
    setSending(true);
    try {
      const { error: msgErr } = await supabase.from("messages").insert({ name, email, content });
      if (msgErr) throw msgErr;
      if (subscribe) { try { await supabase.from("subscribers").insert({ email }); } catch {} }
      setSubmitted(true);
      setName(""); setEmail(""); setContent(""); setSubscribe(false);
    } catch (err: any) { setError(err.message || "Failed"); }
    finally { setSending(false); }
  };

  const infoItems = [
    ...(contactEmail ? [{ icon: Mail, label: "Email", value: contactEmail }] : []),
    { icon: Clock, label: c("contactResponseTime"), value: c("contactResponseValue") },
    { icon: Briefcase, label: c("contactBusinessHours"), value: c("contactBusinessValue") },
  ];

  // Group guides by category
  const guidesByCategory = guides.reduce((acc, guide) => {
    const cat = categories.find((c) => c.id === guide.category_id);
    if (!cat) return acc;
    if (!acc[cat.id]) acc[cat.id] = { category: cat, guides: [] };
    acc[cat.id].guides.push(guide);
    return acc;
  }, {} as Record<number, { category: Category; guides: InstallationGuide[] }>);

  // Default store links if DB is empty
  const defaultStoreLinks: StoreLink[] = [
    { id: 0, country_code: "us", label: t("storeUS") || "US Store", url: "https://www.amazon.com", sort_order: 0, is_active: true },
    { id: 0, country_code: "uk", label: t("storeUK") || "UK Store", url: "https://www.amazon.co.uk", sort_order: 1, is_active: true },
    { id: 0, country_code: "de", label: t("storeDE") || "DE Store", url: "https://www.amazon.de", sort_order: 2, is_active: true },
    { id: 0, country_code: "es", label: t("storeES") || "ES Store", url: "https://www.amazon.es", sort_order: 3, is_active: true },
    { id: 0, country_code: "it", label: t("storeIT") || "IT Store", url: "https://www.amazon.it", sort_order: 4, is_active: true },
    { id: 0, country_code: "fr", label: t("storeFR") || "FR Store", url: "https://www.amazon.fr", sort_order: 5, is_active: true },
  ];
  const displayStoreLinks = storeLinks.length > 0 ? storeLinks : defaultStoreLinks;

  return (
    <div>
      {/* ============ Hero Banner ============ */}
      <section className="bg-brand-600 text-white" style={{ padding: '48px 24px' }}>
        <div className="max-w-[1500px] mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-3">{t("supportTitle") || "Support"}</h1>
          <p className="text-base max-w-2xl mx-auto text-brand-100">{t("supportSubtitle") || "Find installation guides, store links, and get in touch with us."}</p>
        </div>
      </section>

      <main className="max-w-[1500px] mx-auto px-3 sm:px-4 py-10 space-y-12">

        {/* ============ Section 1: Store Links ============ */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-brand-600">
              <Store className="w-4 h-4 text-brand-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t("storeLinksTitle") || "Our Amazon Stores"}</h2>
          </div>
          <p className="text-sm mb-5 text-gray-500">{t("storeLinksDesc") || "Click to visit our store in your country:"}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {displayStoreLinks.map((link) => (
              <a
                key={`${link.country_code}-${link.sort_order}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-4 rounded-lg transition-all hover:shadow-md"
                className="bg-white border border-gray-100"
              >
                <img
                  src={`https://flagcdn.com/w80/${link.country_code === 'uk' ? 'gb' : link.country_code}.png`}
                  alt={link.country_code}
                  className="w-10 h-7 object-cover rounded-sm"
                />
                <span className="text-sm font-semibold text-gray-900">{link.label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              </a>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #eee' }} />

        {/* ============ Section 2: Installation Guides ============ */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-brand-600">
              <BookOpen className="w-4 h-4 text-brand-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t("installationGuidesTitle") || "Installation Guides"}</h2>
          </div>
          <p className="text-sm mb-5 text-gray-500">{t("installationGuidesDesc") || "Find video tutorials and download instruction manuals by product category:"}</p>

          {Object.keys(guidesByCategory).length === 0 ? (
            <div className="text-center py-10 rounded-lg bg-gray-50 border border-dashed border-gray-200">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">{t("noGuides") || "No installation guides available yet."}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.values(guidesByCategory).map(({ category, guides }) => (
                <div key={category.id} className="rounded-lg overflow-hidden border border-gray-100">
                  <div className="px-5 py-3 font-semibold text-sm" style={{ background: '#f7f8f8', color: '#0F1111' }}>
                    {category.name}
                  </div>
                  <div className="p-5 space-y-4">
                    {guides.map((guide) => (
                      <div key={guide.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-gray-50">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{guide.title || `${category.name} Guide`}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {guide.video_url && (
                            <a
                              href={guide.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-all"
                              className="bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 transition-colors"
                            >
                              <Video className="w-3.5 h-3.5" />{t("watchVideo") || "Watch Video"}
                            </a>
                          )}
                          {guide.manual_url && (
                            <a
                              href={guide.manual_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-all"
                              className="bg-white text-gray-900 border border-gray-200 hover:border-brand-300 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />{t("downloadManual") || "Manual"}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #eee' }} />

        {/* ============ Section 3: Contact Us ============ */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-brand-600">
              <MessageSquare className="w-4 h-4 text-brand-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{c("contactTitle")}</h2>
          </div>
          <p className="text-sm mb-5 text-gray-500">{c("contactSubtitle")}</p>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-4 text-gray-900">{c("contactInfo")}</h3>
                <p className="text-sm mb-5 leading-relaxed text-gray-500">{c("contactInfoDesc")}</p>
                <div className="space-y-3">
                  {infoItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white border border-gray-100">
                      <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 bg-brand-600">
                        <item.icon className="w-4 h-4 text-brand-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* FAQ */}
              <div className="bg-white rounded-lg p-5 border border-gray-100">
                <h3 className="font-bold mb-3 text-sm text-gray-900">{c("contactFAQ")}</h3>
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <details key={i} className="group">
                      <summary className="flex items-center justify-between text-sm py-2 cursor-pointer text-gray-900">
                        {c(`contactFAQ${i}Q` as any)}
                        <svg className="w-3.5 h-3.5 transition group-open:rotate-180 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </summary>
                      <p className="pb-2 text-xs text-gray-500">{c(`contactFAQ${i}A` as any)}</p>
                    </details>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg p-6 border border-gray-100">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-50">
                      <Check className="w-7 h-7 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900">{c("contactSuccessTitle")}</h3>
                    <p className="text-sm mb-5 text-gray-500">{c("contactSuccessDesc")}</p>
                    <button onClick={() => setSubmitted(false)} className="text-sm font-medium text-brand-600">{c("contactSendAnother")}</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-lg font-bold mb-2 text-gray-900">{c("contactFormTitle")}</h3>
                    {error && <div className="flex items-center gap-2 p-3 rounded-lg text-sm text-red-600 bg-red-50"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span></div>}
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-900">{c("contactNameLabel")}</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 border rounded-md text-sm outline-none focus:ring-2 border-gray-200" placeholder={c("contactNamePlaceholder")}
                        onFocus={(e) => { e.currentTarget.classList.add("border-brand-500","ring-2","ring-brand-200"); }}
                        onBlur={(e) => { e.currentTarget.classList.remove("border-brand-500","ring-2","ring-brand-200"); }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-900">{c("contactEmailLabel")}</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2.5 border rounded-md text-sm outline-none border-gray-200" placeholder={c("contactEmailPlaceholder")}
                        onFocus={(e) => { e.currentTarget.classList.add("border-brand-500","ring-2","ring-brand-200"); }}
                        onBlur={(e) => { e.currentTarget.classList.remove("border-brand-500","ring-2","ring-brand-200"); }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-900">{c("contactMessageLabel")}</label>
                      <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} className="w-full px-3 py-2.5 border rounded-md text-sm outline-none resize-none border-gray-200" placeholder={c("contactMessagePlaceholder")}
                        onFocus={(e) => { e.currentTarget.classList.add("border-brand-500","ring-2","ring-brand-200"); }}
                        onBlur={(e) => { e.currentTarget.classList.remove("border-brand-500","ring-2","ring-brand-200"); }} />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={subscribe} onChange={e => setSubscribe(e.target.checked)} className="w-4 h-4 rounded accent-brand-600" />
                      <span className="text-sm text-gray-500">{c("contactSubscribe")}</span>
                    </label>
                    <button type="submit" disabled={sending} className="w-full py-2.5 rounded-md text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-brand-600 text-white border border-brand-700 hover:bg-brand-700 transition-colors">
                      <Send className="w-4 h-4" /><span>{sending ? c("contactSending") : c("contactSend")}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
