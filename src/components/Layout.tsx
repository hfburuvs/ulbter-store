import { Link, useLocation, useNavigate } from "react-router";
import { useCountry } from "@/hooks/useCountry";
import { countryConfig, type CountryCode } from "@/lib/i18n";
import { type ReactNode, useState, useEffect } from "react";
import {
  ShoppingBag,
  Menu,
  X,
  MessageSquare,
  Shield,
  Home,
  Info,
  ChevronDown,
  Search,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabase";

function isHomePath(pathname: string): boolean {
  if (pathname === '/') return true;
  // Match /xx or /xx/ where xx is any 2-letter country code
  return /^\/[a-z]{2}\/?$/i.test(pathname);
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface NavItem {
  id: number;
  label: string;
  link: string;
  parent_id: number;
  sort_order: number;
  is_active: number;
}

interface Setting {
  key: string;
  value: string;
}

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [seoMap, setSeoMap] = useState<Record<string, string>>({});
  const [dbCountries, setDbCountries] = useState<any[]>([]);
  const [analyticsCode, setAnalyticsCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { country, t, path, switchCountry } = useCountry();

  // Sync searchQuery with URL search param on mount and when URL changes
  useEffect(() => {
    const urlSearch = new URLSearchParams(location.search).get("search") || "";
    setSearchQuery(urlSearch);
    if (urlSearch) setSearchOpen(true);
  }, [location.search]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    async function loadData() {
      try {
        // Load categories that have products for the current country
        const { data: productCats } = await supabase
          .from("products")
          .select("category_id")
          .eq("country", country);
        const activeCatIds = new Set((productCats || []).map((p: any) => p.category_id));

        const [{ data: cats }, { data: settings }, { data: navs }, { data: countriesData }] = await Promise.all([
          supabase.from("categories").select("*").order("sort_order", { ascending: true }),
          supabase.from("settings").select("*"),
          supabase.from("navigation").select("*").eq("is_active", 1).order("sort_order", { ascending: true }),
          supabase.from("countries").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
        ]);
        setDbCountries(countriesData || []);
        // Only show categories that have products for this country
        const filteredCats = (cats || []).filter((c: Category) => activeCatIds.has(c.id));
        setCategories(filteredCats as Category[]);
        setNavItems((navs || []) as NavItem[]);

        const map: Record<string, string> = {};
        (settings || []).forEach((s: Setting) => {
          map[s.key] = s.value;
        });
        setSettingsMap(map);

        // Load analytics code independently (don't let other queries fail affect this)
        try {
          // Try with is_active filter first, fallback to all rows
          let { data: analytics } = await supabase.from("analytics").select("code,is_active").eq("is_active", true);
          if (!analytics || analytics.length === 0) {
            const { data: allAnalytics } = await supabase.from("analytics").select("code,is_active");
            analytics = (allAnalytics || []).filter((a: any) => a.is_active === true || a.is_active === 1 || a.is_active === "1");
          }
          console.log("[Analytics] Loaded", analytics?.length || 0, "active codes");
          if (analytics && analytics.length > 0) {
            const code = analytics.map((a: any) => a.code).join("\n");
            console.log("[Analytics] Code length:", code.length, "chars");
            setAnalyticsCode(code);
          } else {
            console.log("[Analytics] No active codes found");
            setAnalyticsCode("");
          }
        } catch (analyticsErr: any) {
          console.error("[Layout] Failed to load analytics:", analyticsErr);
          setAnalyticsCode("");
        }

        // Load SEO settings independently
        try {
          const { data: seoSettings } = await supabase.from("seo_settings").select("*");
          const seo: Record<string, string> = {};
          (seoSettings || []).forEach((s: any) => { seo[s.key] = s.value; });
          setSeoMap(seo);
        } catch (seoErr: any) {
          console.error("[Layout] Failed to load SEO settings:", seoErr);
          setSeoMap({});
        }
      } catch (err: any) {
        console.error("[Layout] Failed to load main data:", err);
        // Set empty defaults to avoid undefined state
        setCategories([]);
        setNavItems([]);
        setSettingsMap({});
      }
    }
    loadData();
  }, [country]);

  // Dynamically inject analytics scripts when analyticsCode changes
  useEffect(() => {
    if (!analyticsCode || analyticsCode.trim().length === 0) return;
    if ((window as any).__analyticsInjected) return;
    const gtagMatch = analyticsCode.match(/gtag\('config',\s*['"](G-[A-Z0-9]+)['"]\)/);
    const gtagId = gtagMatch ? gtagMatch[1] : null;
    if (gtagId) {
      if (document.querySelector(`script[data-gtag="${gtagId}"]`)) return;
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
      script.setAttribute('data-gtag', gtagId);
      document.head.appendChild(script);
      const inline = document.createElement('script');
      inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gtagId}');`;
      document.head.appendChild(inline);
      (window as any).__analyticsInjected = true;
      console.log('[Analytics] gtag.js injected for', gtagId);
    } else {
      const inline = document.createElement('script');
      inline.textContent = analyticsCode;
      document.head.appendChild(inline);
      (window as any).__analyticsInjected = true;
    }
  }, [analyticsCode]);

  const siteTitle = settingsMap["siteTitle"] || "ulbter";
  const contactEmail = settingsMap["contactEmail"] || "";
  const logoImage = settingsMap["logoImage"] || "";

  // Country flag image URL from flagcdn (ISO 3166-1 alpha-2 codes)
  // Note: UK uses 'gb' as ISO code, so we map internal codes to ISO codes
  const flagUrl = (code: string) => {
    const isoMap: Record<string, string> = { uk: 'gb' };
    const isoCode = isoMap[code?.toLowerCase()] || code?.toLowerCase();
    return `https://flagcdn.com/w40/${isoCode}.png`;
  };
  // SEO: prioritize seo_settings table, fallback to settings table, then defaults
  const metaKeywords =
    seoMap["metaKeywords"] ||
    settingsMap["metaKeywords"] ||
    "screen protector, tempered glass, camera accessories, watch accessories";
  const metaDescription =
    seoMap["metaDescription"] ||
    settingsMap["metaDescription"] ||
    "Premium screen protectors and accessories for cameras and smartwatches.";

  const cleanPath = location.pathname.replace(/^\/(de|es|it|fr)\b/, "") || "/";
  const siteTagline = settingsMap["siteTagline"] || "";
  const pageTitle =
    cleanPath === "/"
      ? siteTagline ? `${siteTitle} - ${siteTagline}` : siteTitle
      : cleanPath === "/support"
      ? `${t("support") || "Support"} - ${siteTitle}`
      : cleanPath === "/about"
      ? `${t("about")} - ${siteTitle}`
      : cleanPath.startsWith("/product/")
      ? `${t("products")} - ${siteTitle}`
      : cleanPath.startsWith("/category/")
      ? `${t("categories")} - ${siteTitle}`
      : siteTitle;

  // Build nav from DB; fallback to hardcoded if empty
  const hasCustomNav = navItems.length > 0;
  const topLevelNavs = hasCustomNav
    ? navItems.filter((n) => n.parent_id === 0)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="keywords" content={metaKeywords} />
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      {/* ===== TOP BAR ===== */}
      <div className="bg-brand-700 text-white text-xs py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <span className="truncate">{settingsMap["topBarText"] || t("topBarText") || "Free shipping on orders over $50 | New arrivals weekly"}</span>
        </div>
      </div>

      {/* ===== NAVIGATION BAR ===== */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-black/[0.06] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
              {logoImage && logoImage.trim().length > 10 ? (
                <img src={logoImage} alt={siteTitle} style={{ height: 36, width: 'auto' }} />
              ) : (
                <>
                  <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">U</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 tracking-tight">
                    {siteTitle}
                  </span>
                </>
              )}
            </Link>

            {/* Desktop Search - Centered */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      navigate(path(`/?search=${encodeURIComponent(searchQuery.trim())}`));
                    }
                  }}
                  className="flex items-center"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products, brands, categories..."
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-100 border-0 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(""); navigate(path("/")); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {hasCustomNav ? (
                // Dynamic nav from database
                <>
                  {topLevelNavs.map((item) => {
                    const navLabelMap: Record<string, string> = {
                      home: t("home"),
                      products: t("products"),
                      about: t("about"),
                      contact: t("support") || "Support",
                    };
                    const children = navItems.filter((n) => n.parent_id === item.id);
                    const isActive = location.pathname === item.link;
                    const isProducts = item.label?.toLowerCase() === "products" || item.link === "#products";
                    const displayLabel = navLabelMap[item.label?.toLowerCase()] || item.label;
                    if (children.length > 0 || isProducts) {
                      return (
                        <div key={item.id} className="relative group">
                          <button className={`nav-pill flex items-center space-x-1 text-sm font-medium px-4 py-2 rounded-full transition-colors ${isActive ? "text-brand-600 bg-brand-50" : "text-gray-700 hover:text-brand-600 hover:bg-brand-50"}`}>
                            <span>{displayLabel}</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 hidden group-hover:block">
                            {children.length > 0 ? (
                              children.map((child) => {
                                const childLabel = navLabelMap[child.label?.toLowerCase()] || child.label;
                                const isCatAnchor = child.link?.includes("#cat-");
                                if (isCatAnchor) {
                                  const catSlug = child.link.split("#cat-")[1];
                                  return (
                                    <a key={child.id} href={child.link} onClick={(e) => { e.preventDefault(); if (isHomePath(location.pathname)) { setTimeout(() => { const el = document.getElementById(`cat-${catSlug}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); } else { sessionStorage.setItem("scrollToCategory", `cat-${catSlug}`); navigate(path("/")); } }} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600 transition-colors">
                                      <span className="w-2 h-2 rounded-full bg-brand-600 mr-3" />
                                      {childLabel}
                                    </a>
                                  );
                                }
                                return (
                                  <Link key={child.id} to={child.link} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600 transition-colors">
                                    <span className="w-2 h-2 rounded-full bg-brand-600 mr-3" />
                                    {childLabel}
                                  </Link>
                                );
                              })
                            ) : (
                              categories.map((cat) => (
                                <a key={cat.id} href={path(`/#cat-${cat.slug}`)} onClick={(e) => { e.preventDefault(); setProductsOpen(false); if (isHomePath(location.pathname)) { setTimeout(() => { const el = document.getElementById(`cat-${cat.slug}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); } else { sessionStorage.setItem("scrollToCategory", `cat-${cat.slug}`); navigate(path("/")); } }} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600 transition-colors">
                                  <span className="w-2 h-2 rounded-full bg-brand-600 mr-3" />
                                  {cat.name}
                                </a>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <Link key={item.id} to={item.link === "/" ? path("/") : item.link === "/about" ? path("/about") : item.link === "/contact" ? path("/support") : item.link} className={`nav-pill flex items-center space-x-1 text-sm font-medium px-4 py-2 rounded-full transition-colors ${isActive ? "text-brand-600 bg-brand-50" : "text-gray-700 hover:text-brand-600 hover:bg-brand-50"}`}>
                        <span>{displayLabel}</span>
                      </Link>
                    );
                  })}
                </>
              ) : (
                // Fallback: hardcoded nav
                <>
                  <Link
                    to={path("/")}
                    className={`nav-pill flex items-center space-x-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                      cleanPath === "/"
                        ? "text-brand-600 bg-brand-50"
                        : "text-gray-700 hover:text-brand-600 hover:bg-brand-50"
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    <span>{t("home")}</span>
                  </Link>

                  <div
                    className="relative"
                    onMouseEnter={() => setProductsOpen(true)}
                    onMouseLeave={() => setProductsOpen(false)}
                  >
                    <button
                      className={`nav-pill flex items-center space-x-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                        location.pathname.startsWith("/category")
                          ? "text-brand-600 bg-brand-50"
                          : "text-gray-700 hover:text-brand-600 hover:bg-brand-50"
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{t("products")}</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          productsOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {productsOpen && categories.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                        {categories.map((cat) => (
                          <a
                            key={cat.id}
                            href={path(`/#cat-${cat.slug}`)}
                            onClick={(e) => {
                              e.preventDefault();
                              setProductsOpen(false);
                              const pn = location.pathname;
                              if (isHomePath(pn)) {
                                setTimeout(() => { const el = document.getElementById(`cat-${cat.slug}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
                              } else {
                                sessionStorage.setItem("scrollToCategory", `cat-${cat.slug}`);
                                navigate(path("/"));
                              }
                            }}
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                          >
                            <span className="w-2 h-2 rounded-full bg-brand-600 mr-3" />
                            {cat.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    to={path("/about")}
                    className={`nav-pill flex items-center space-x-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                      cleanPath === "/about"
                        ? "text-brand-600 bg-brand-50"
                        : "text-gray-700 hover:text-brand-600 hover:bg-brand-50"
                    }`}
                  >
                    <Info className="w-4 h-4" />
                    <span>{t("about")}</span>
                  </Link>

                  <Link
                    to={path("/support")}
                    className={`nav-pill flex items-center space-x-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                      cleanPath === "/support"
                        ? "text-brand-600 bg-brand-50"
                        : "text-gray-700 hover:text-brand-600 hover:bg-brand-50"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{t("support") || "Support"}</span>
                  </Link>
                </>
              )}
            </div>

            {/* Right side: Country switcher + Mobile menu */}
            <div className="flex items-center gap-2">
              {/* Country Switcher with flag images */}
              <div className="relative group">
                <button className="flex items-center gap-1.5 text-sm font-medium px-2 py-1.5 rounded-full text-gray-700 hover:bg-gray-100 transition-colors">
                  <img src={flagUrl(country)} width={20} height={15} style={{ borderRadius: 2, objectFit: 'cover' }} alt={country} />
                  <span className="uppercase text-xs">{country}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 hidden group-hover:block">
                  {(dbCountries.length > 0 ? dbCountries : []).map((c: any) => (
                    <button
                      key={c.code}
                      onClick={() => switchCountry(c.code as CountryCode)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                        country === c.code ? "text-brand-600 bg-brand-50 font-medium" : "text-gray-700 hover:bg-brand-50 hover:text-brand-600"
                      }`}
                    >
                      <img src={flagUrl(c.code)} width={20} height={15} style={{ borderRadius: 2, objectFit: 'cover' }} alt={c.code} />
                      <span>{c.name || c.code.toUpperCase()}</span>
                    </button>
                  ))}
                  {dbCountries.length === 0 && (
                    <p className="px-4 py-2 text-sm text-gray-400 text-center">No active countries</p>
                  )}
                </div>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-gray-600 hover:text-gray-900 p-2"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-3 border-b border-gray-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
                    setMobileMenuOpen(false);
                  }
                }}
                className="flex items-center"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-r-lg transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>
            </div>
            <div className="px-4 py-3 space-y-1">
              {hasCustomNav ? (
                navItems
                  .filter((n) => n.parent_id === 0)
                  .map((item) => (
                    <Link
                      key={item.id}
                      to={item.link === "/" ? path("/") : item.link === "/about" ? path("/about") : item.link === "/contact" ? path("/support") : item.link}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      <span>{item.label}</span>
                    </Link>
                  ))
              ) : (
                <>
                  <Link
                    to={path("/")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    <Home className="w-4 h-4" />
                    <span>{t("home")}</span>
                  </Link>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={path(`/category/${cat.slug}`)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 pl-8 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                      <span>{cat.name}</span>
                    </Link>
                  ))}
                  <Link
                    to={path("/about")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    <Info className="w-4 h-4" />
                    <span>{t("about")}</span>
                  </Link>
                  <Link
                    to={path("/support")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{t("support") || "Support"}</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ===== SUB-NAV: Category Quick Links (sticky) ===== */}
      {categories.length > 0 && (
        <div className="bg-white border-b border-gray-100 hidden md:block sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
              <span className="text-xs text-gray-400 font-medium mr-2 flex-shrink-0 uppercase tracking-wider">Categories</span>
              {categories.map((cat) => (
                <a
                  key={cat.id}
                  href={path(`/#cat-${cat.slug}`)}
                  onClick={(e) => {
                    e.preventDefault();
                    const pn = location.pathname;
                    if (isHomePath(pn)) {
                      setTimeout(() => { const el = document.getElementById(`cat-${cat.slug}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
                    } else {
                      sessionStorage.setItem("scrollToCategory", `cat-${cat.slug}`);
                      navigate(path("/"));
                    }
                  }}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap flex-shrink-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                  {cat.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1">{children}</main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">U</span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {siteTitle}
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {settingsMap["footerAbout"] || t("footerAbout") || "Discover quality products from trusted brands. Shop with confidence."}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">
                {t("quickLinks") || "Quick Links"}
              </h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <Link to={path("/")} className="hover:text-brand-600 transition-colors">
                    {t("home")}
                  </Link>
                </li>
                <li>
                  <Link to={path("/about")} className="hover:text-brand-600 transition-colors">
                    {t("about")}
                  </Link>
                </li>
                <li>
                  <Link to={path("/support")} className="hover:text-brand-600 transition-colors">
                    {t("support") || "Support"}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">
                {t("categories") || "Categories"}
              </h4>
              <ul className="space-y-2 text-sm text-gray-500">
                {categories.slice(0, 6).map((cat) => (
                  <li key={cat.id}>
                    <a
                      href={path(`/#cat-${cat.slug}`)}
                      onClick={(e) => {
                        e.preventDefault();
                        const pn = location.pathname;
                        if (isHomePath(pn)) {
                          setTimeout(() => { const el = document.getElementById(`cat-${cat.slug}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
                        } else {
                          sessionStorage.setItem("scrollToCategory", `cat-${cat.slug}`);
                          navigate(path("/"));
                        }
                      }}
                      className="hover:text-brand-600 transition-colors"
                    >
                      {cat.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter + Admin */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">
                Stay Updated
              </h4>
              <p className="text-sm text-gray-500 mb-3">
                Subscribe for new products and deals.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  readOnly
                />
                <button className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                  Subscribe
                </button>
              </div>

            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} {siteTitle}. {t("copyright") || "All rights reserved."}
          </div>
        </div>
      </footer>

      {/* Analytics code injection */}
      {/* Analytics code is injected via useEffect above */}
    </div>
  );
}
