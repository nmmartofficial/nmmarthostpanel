import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Phone,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  Layers,
  MessageCircle,
  BarChart3,
  Box,
  CheckCircle2,
  Lock,
  ChevronDown,
  Globe,
  Cloud,
  Database,
  Receipt,
  Users,
  Store,
  Tag,
  Printer,
  Wifi,
  Cpu,
  Play,
  Check,
  Star,
  ChevronRight,
  Menu,
  X,
  Target,
  Eye,
  Mail,
  Clock,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  ArrowUpRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const contactNumber = "917081154604";
  const displayPhone = "+91 7081154604";
  const secondPhone = "+918090102034";
  const secondDisplayPhone = "+91 80901 02034";
  const whatsappLink1 = `https://wa.me/${contactNumber}?text=Hello%20NM%20MART,%20I'm%20interested%20in%20your%20Management%20Solutions.`;
  const whatsappLink2 = `https://wa.me/918090102034?text=Hello%20NM%20MART,%20I'm%20interested%20in%20your%20Management%20Solutions.`;
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { title: 'Inventory', icon: Box, desc: 'Real-time stock management' },
    { title: 'POS Billing', icon: Receipt, desc: 'Ultra-fast checkout system' },
    { title: 'Purchase', icon: ShoppingBag, desc: 'Streamlined procurement' },
    { title: 'Sales', icon: Tag, desc: 'Omnichannel sales tracking' },
    { title: 'CRM', icon: Users, desc: 'Customer relationship tools' },
    { title: 'GST', icon: Globe, desc: 'Automated tax compliance' },
    { title: 'Reports', icon: BarChart3, desc: 'Advanced analytics' },
    { title: 'Analytics', icon: Zap, desc: 'AI-powered insights' },
    { title: 'Multi Store', icon: Store, desc: 'Unified store management' },
    { title: 'Barcode', icon: Printer, desc: 'Seamless label printing' },
    { title: 'Loyalty', icon: Star, desc: 'Reward program engine' },
    { title: 'WhatsApp', icon: MessageCircle, desc: 'Integrated messaging' },
    { title: 'Cloud Backup', icon: Cloud, desc: 'Secure data sync' },
    { title: 'Multi Tenant', icon: Layers, desc: 'Enterprise architecture' },
    { title: 'AI Ready', icon: Cpu, desc: 'Future-proof platform' },
  ];

  const stats = [
    { label: 'Rating', value: '4.9', icon: Star },
    { label: 'Retail Stores', value: '1200+', icon: Store },
    { label: 'Transactions', value: '2M+', icon: Receipt },
    { label: 'Uptime', value: '99.99%', icon: ShieldCheck },
    { label: 'Support', value: '24×7', icon: Phone },
  ];

  const logos = ['Supabase', 'Google Cloud', 'Vercel', 'WhatsApp', 'Razorpay', 'Barcode', 'GST', 'Cloud'];
  const whyChoose = [
    { title: 'Fast', desc: 'Lightning fast performance', icon: Zap },
    { title: 'Secure', desc: 'Enterprise-grade security', icon: ShieldCheck },
    { title: 'Cloud', desc: 'Always available', icon: Cloud },
    { title: 'Offline Sync', desc: 'Work without internet', icon: Wifi },
    { title: 'Multi Tenant', desc: 'Built for scale', icon: Layers },
    { title: 'Enterprise Ready', desc: 'Production-grade', icon: CheckCircle2 },
  ];
  const steps = [
    { step: '1', title: 'Register', desc: 'Create your account in seconds' },
    { step: '2', title: 'Setup Store', desc: 'Configure your retail operations' },
    { step: '3', title: 'Start Selling', desc: 'Begin processing transactions' },
    { step: '4', title: 'Track Growth', desc: 'Monitor your business success' },
  ];
  const testimonials = [
    {
      name: 'Rajesh Kumar',
      business: 'SuperMart India',
      text: 'NM MART transformed our retail operations completely. We saw 40% growth in first month.',
      rating: 5,
    },
    {
      name: 'Priya Sharma',
      business: 'Fashion Hub',
      text: 'The best ERP solution for retail businesses. Intuitive, fast and reliable.',
      rating: 5,
    },
    {
      name: 'Amit Patel',
      business: 'Fresh Grocers',
      text: '24/7 support and seamless updates keep our business running smoothly.',
      rating: 5,
    },
  ];
  const pricing = [
    { name: 'Starter', price: '₹999', period: '/month', features: ['1 Store', '1000 Products', 'Basic Reports', 'Email Support'] },
    { name: 'Business', price: '₹2,999', period: '/month', features: ['5 Stores', 'Unlimited Products', 'Advanced Analytics', 'Priority Support', 'WhatsApp Integration'], featured: true },
    { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited Stores', 'White Label', 'Dedicated Manager', 'SLA Guarantee', 'Custom Integrations'] },
  ];
  const faqs = [
    { q: 'Is NM MART suitable for small businesses?', a: 'Absolutely! Our platform is designed for businesses of all sizes, from single stores to large chains.' },
    { q: 'Can I use NM MART offline?', a: 'Yes, our offline sync feature allows you to continue working even without internet connectivity.' },
    { q: 'How secure is my data?', a: 'We use enterprise-grade encryption and cloud backup to ensure your data is always safe and accessible.' },
    { q: 'Do you provide training?', a: 'Yes, we offer comprehensive onboarding and 24/7 support to help you get started quickly.' },
  ];

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col relative selection:bg-blue-600 selection:text-white antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: 'radial-gradient(60% 50% at 50% 0%, rgba(37, 99, 235, 0.08) 0%, rgba(255, 255, 255, 0) 100%), radial-gradient(40% 40% at 90% 10%, rgba(79, 70, 229, 0.06) 0%, rgba(255, 255, 255, 0) 100%)'
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(to right, rgba(15, 23, 42, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <ShoppingBag className="text-white" size={22} fill="white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">NM MART</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {[
              { name: 'Features', id: 'features' },
              { name: 'Modules', id: 'features' },
              { name: 'Solutions', id: 'solutions' },
              { name: 'Pricing', id: 'pricing' },
              { name: 'About', id: 'about' },
              { name: 'Contact', id: 'contact' }
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.id)}
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                {item.name}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/nm-mart" className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">Login</Link>
            <a href={whatsappLink1} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all">
              Request Demo
            </a>
            <a href={whatsappLink1} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all">
              Start Free Trial
            </a>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-700">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
              >
                <div className="px-6 py-6 flex flex-col gap-4">
                  {[
                    { name: 'Features', id: 'features' },
                    { name: 'Modules', id: 'features' },
                    { name: 'Solutions', id: 'solutions' },
                    { name: 'Pricing', id: 'pricing' },
                    { name: 'About', id: 'about' },
                    { name: 'Contact', id: 'contact' }
                  ].map((item) => (
                    <button
                      key={item.name}
                      onClick={() => scrollToSection(item.id)}
                      className="text-left text-lg font-medium text-slate-700"
                    >
                      {item.name}
                    </button>
                  ))}
                  <div className="h-px bg-slate-100 my-2" />
                  <Link to="/nm-mart" className="text-lg font-medium text-blue-600">Login</Link>
                  <a href={whatsappLink1} target="_blank" rel="noopener noreferrer" className="w-full py-3 text-center font-semibold text-white bg-blue-600 rounded-xl">
                    Start Free Trial
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </header>

      <main className="relative z-10 pt-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-8">
                <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full">
                  <Sparkles size={16} className="text-blue-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Enterprise Retail ERP</span>
                </motion.div>

                <motion.h1 variants={fadeIn} className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight text-slate-900">
                  Powering Modern <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Retail Businesses</span>
                </motion.h1>

                <motion.p variants={fadeIn} className="text-lg md:text-xl text-slate-600 leading-relaxed">
                  NM MART is the enterprise-grade retail management platform trusted by thousands of businesses. Streamline operations, boost sales, and scale with confidence.
                </motion.p>

                <motion.div variants={fadeIn} className="flex flex-wrap gap-4">
                  <a href={whatsappLink1} target="_blank" rel="noopener noreferrer" className="group px-8 py-4 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 transition-all flex items-center gap-2">
                    Start Free Trial
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                  <a href="#demo" className="group px-8 py-4 bg-white text-slate-700 font-semibold rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center gap-2">
                    <Play size={20} className="text-blue-600" />
                    Watch Demo
                  </a>
                </motion.div>

                <motion.div variants={fadeIn} className="pt-4">
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    Trusted by Retail Businesses Across India
                  </p>
                </motion.div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
                <div className="relative bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                  <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="p-6 bg-gradient-to-br from-slate-50 to-white">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {[1, 2, 3, 4].map((i) => (
                        <motion.div key={i} animate={{ y: [0, -10, 0] }} transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                            <BarChart3 size={16} className="text-blue-600" />
                          </div>
                          <div className="text-sm font-semibold text-slate-900">Sales Growth</div>
                          <div className="text-2xl font-bold text-blue-600">+24%</div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="h-40 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-sm text-slate-500">Dashboard Preview</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-16 border-y border-slate-100 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap justify-between items-center gap-8">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} size={20} className="text-yellow-500" fill="currentColor" />)}
                <span className="ml-2 text-sm font-semibold text-slate-700">4.9 Rating</span>
              </div>
              {stats.slice(1).map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Brand Logos */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale">
              {logos.map((logo, i) => (
                <div key={i} className="text-xl font-bold tracking-tight text-slate-400">
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
              <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">About NM MART</motion.h2>
              <motion.p variants={fadeIn} className="text-lg text-blue-600 font-medium mb-8">Enterprise Retail ERP Platform</motion.p>
              <motion.p variants={fadeIn} className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed mb-12">
                NM MART is a modern cloud-based Retail ERP platform designed for grocery stores, supermarkets, pharmacies, wholesalers and multi-store retail businesses.
              </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {[
                "Billing & POS",
                "Inventory",
                "Purchase",
                "Sales",
                "Accounts",
                "CRM",
                "Reports",
                "Multi-Store Management",
                "Multi-Tenant SaaS",
                "Customer App",
                "Analytics"
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all"
                >
                  <CheckCircle2 size={20} className="text-blue-600 flex-shrink-0" />
                  <span className="text-slate-700 font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-16">
              {[
                { icon: Target, title: "Our Mission", text: "Helping every retailer digitize their business using enterprise-grade technology." },
                { icon: Eye, title: "Our Vision", text: "To become India's most trusted cloud retail ERP platform." }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-100"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                    <item.icon size={32} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{item.title}</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { number: "500+", label: "Retail Stores", icon: Store },
                { number: "50K+", label: "Orders Processed", icon: Receipt },
                { number: "99.9%", label: "System Uptime", icon: ShieldCheck },
                { number: "24x7", label: "Support", icon: Phone }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-6 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all"
                >
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <stat.icon size={28} className="text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-2">{stat.number}</div>
                  <div className="text-slate-600 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
              <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything You Need</motion.h2>
              <motion.p variants={fadeIn} className="text-lg text-slate-600 max-w-2xl mx-auto">
                Comprehensive retail management features designed to grow with your business.
              </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
              {features.map((feature, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} whileHover={{ y: -4 }} className="p-6 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon size={24} className="text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-500">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose */}
        <section id="solutions" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why Choose NM MART</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">Built for performance, security, and reliability.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {whyChoose.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                    <item.icon size={28} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            </div>
            <div className="relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 -translate-x-1/2 hidden md:block" />
              {steps.map((step, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className={`relative flex items-center gap-8 mb-12 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className="hidden md:flex w-1/2" />
                  <div className="absolute left-1/2 -translate-x-1/2 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold z-10 hidden md:flex">
                    {step.step}
                  </div>
                  <div className="flex-1 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="md:hidden mb-4 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {step.step}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-slate-600">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">What Our Users Say</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex gap-1 mb-6">
                    {[...Array(t.rating)].map((_, j) => <Star key={j} size={20} className="text-yellow-500" fill="currentColor" />)}
                  </div>
                  <p className="text-slate-600 mb-6 leading-relaxed">"{t.text}"</p>
                  <div>
                    <div className="font-semibold text-slate-900">{t.name}</div>
                    <div className="text-sm text-slate-500">{t.business}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
              <p className="text-lg text-slate-600">Choose the plan that's right for your business.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {pricing.map((plan, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className={`relative p-8 rounded-3xl border transition-all ${plan.featured ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-transparent shadow-xl shadow-blue-500/30' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                  {plan.featured && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-xs font-bold">Most Popular</div>}
                  <h3 className={`text-xl font-bold mb-2 ${plan.featured ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className={`text-4xl font-bold ${plan.featured ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                    <span className={`${plan.featured ? 'text-blue-200' : 'text-slate-500'}`}>{plan.period}</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <Check size={18} className={plan.featured ? 'text-green-300' : 'text-green-500'} />
                        <span className={plan.featured ? 'text-blue-100' : 'text-slate-600'}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a href={whatsappLink1} target="_blank" rel="noopener noreferrer" className={`block w-full py-3 text-center font-semibold rounded-xl transition-all ${plan.featured ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    Get Started
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} className="w-full px-6 py-5 flex justify-between items-center text-left">
                    <span className="font-semibold text-slate-900">{faq.q}</span>
                    <ChevronDown size={20} className={`text-slate-400 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {activeFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-5">
                        <p className="text-slate-600">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
              <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Contact Us</motion.h2>
              <motion.p variants={fadeIn} className="text-lg text-slate-600">We would love to hear from you.</motion.p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                {[
                  { icon: Phone, title: "Phone", value: displayPhone, tel: `tel:${contactNumber}`, wa: whatsappLink1 },
                  { icon: Phone, title: "Phone", value: secondDisplayPhone, tel: `tel:${secondPhone}`, wa: whatsappLink2 },
                  { icon: Mail, title: "Email", value: "support@nmmart.in", href: "mailto:support@nmmart.in" },
                  { icon: Clock, title: "Business Hours", value: "Monday - Saturday\n9:00 AM - 8:00 PM" },
                  { icon: MapPin, title: "Address", value: "India" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <item.icon size={24} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-2">{item.title}</h4>
                        {item.tel ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <a href={item.tel} className="text-slate-700 font-medium hover:text-blue-600 transition-colors whitespace-pre-line">
                              {item.value}
                            </a>
                            <a href={item.wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
                              <MessageCircle size={16} />
                              WhatsApp
                            </a>
                          </div>
                        ) : item.href ? (
                          <a href={item.href} className="text-slate-700 font-medium hover:text-blue-600 transition-colors">
                            {item.value}
                          </a>
                        ) : (
                          <p className="text-slate-700 whitespace-pre-line">{item.value}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl border border-slate-200 p-8 flex flex-col items-center justify-center"
              >
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <MapPin size={40} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Our Office Location</h3>
                <p className="text-slate-600 text-lg">Coming Soon</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Transform Your Retail Business?</h2>
              <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">Join thousands of retailers who trust NM MART to power their growth.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href={whatsappLink1} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-2xl hover:bg-blue-50 transition-all">
                  Start Free Trial
                </a>
                <a href={whatsappLink1} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-blue-700/50 text-white font-semibold rounded-2xl border border-white/20 hover:bg-blue-700/70 transition-all">
                  Book Demo
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="text-white" size={22} fill="white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">NM MART</span>
              </div>
              <p className="text-slate-400 mb-6">Enterprise-grade retail management platform for modern businesses.</p>
              <div className="flex items-center gap-4">
                {[
                  { icon: Facebook, name: "Facebook" },
                  { icon: Instagram, name: "Instagram" },
                  { icon: Linkedin, name: "LinkedIn" },
                  { icon: Youtube, name: "YouTube" },
                ].map((social, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                    aria-label={social.name}
                  >
                    <social.icon size={20} className="text-slate-300 hover:text-white" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                {['Features', 'Modules', 'Pricing', 'Solutions'].map((item, i) => (
                  <li key={i}>
                    <button
                      onClick={() => scrollToSection(item === 'Features' ? 'features' : item === 'Solutions' ? 'solutions' : item === 'Pricing' ? 'pricing' : 'features')}
                      className="hover:text-blue-400 transition-colors text-left"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3">
                {[
                  { name: 'About', id: 'about' },
                  { name: 'Contact', id: 'contact' },
                  { name: 'Privacy Policy', id: null },
                  { name: 'Terms', id: null }
                ].map((item, i) => (
                  <li key={i}>
                    {item.id ? (
                      <button
                        onClick={() => scrollToSection(item.id)}
                        className="hover:text-blue-400 transition-colors text-left"
                      >
                        {item.name}
                      </button>
                    ) : (
                      <a href="#" className="hover:text-blue-400 transition-colors">{item.name}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-3">
                {['Documentation', 'Help Center', 'Contact'].map((item, i) => (
                  <li key={i}>
                    {item === 'Contact' ? (
                      <button
                        onClick={() => scrollToSection('contact')}
                        className="hover:text-blue-400 transition-colors text-left"
                      >
                        {item}
                      </button>
                    ) : (
                      <a href="#" className="hover:text-blue-400 transition-colors">{item}</a>
                    )}
                  </li>
                ))}
                <li>
                  <Link to="/nm-mart" className="hover:text-blue-400 transition-colors">Staff Portal</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">© 2026 NM MART Ultra Retail ERP. All Rights Reserved.</p>
            <div className="flex items-center gap-4">
              <a href={`tel:${contactNumber}`} className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors">
                <Phone size={16} /> {displayPhone}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
