import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Footer } from "@/components/footer";
import { AuthProvider } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Knowledge from "@/pages/knowledge";
import AICompanion from "@/pages/ai-companion";
import Insights from "@/pages/insights";
import History from "@/pages/history";
import Settings from "@/pages/settings";
import Personalize from "@/pages/personalize";
import Trends from "@/pages/trends";
import TrendDetail from "@/pages/trend-detail";
import Projects from "@/pages/projects";
import Resources from "@/pages/resources";
import ImplementationPreview from "@/pages/implementation-preview";
import ImplementationDetail from "@/pages/implementation-detail";
import Ideas from "@/pages/ideas";
import NotFound from "@/pages/not-found";

import Welcome from "@/pages/welcome";
import Login from "@/pages/auth/login";
import Signup from "@/pages/auth/signup";

import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { ElectronTitleBar } from "@/components/electron-title-bar";

function HeaderUserSection() {
  const { user } = useAuth();
  return (
    <div className="flex items-center gap-4">
      {user && (
        <span className="text-sm font-medium hidden sm:inline-block">
          {user.username}
        </span>
      )}
      <UserAvatar />
      <ThemeToggle />
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user && !["/welcome", "/auth", "/auth/login", "/auth/signup"].includes(location)) {
      setLocation("/welcome");
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {user ? <Dashboard /> : <Welcome />}
      </Route>
      <Route path="/welcome" component={Welcome} />
      <Route path="/auth" component={Login} />
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/signup" component={Signup} />
      {user ? (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/chat" component={Chat} />
          <Route path="/knowledge" component={Knowledge} />
          <Route path="/ai-companion" component={AICompanion} />
          <Route path="/insights" component={Insights} />
          <Route path="/history" component={History} />
          <Route path="/trends" component={Trends} />
          <Route path="/trends/:id" component={TrendDetail} />
          <Route path="/projects" component={Projects} />
          <Route path="/resources" component={Resources} />
          <Route path="/personalize" component={Personalize} />
          <Route path="/implementation/preview/:conceptId" component={ImplementationPreview} />
          <Route path="/implementation/:id" component={ImplementationDetail} />
          <Route path="/settings" component={Settings} />
          <Route path="/ideas" component={Ideas} />
        </>
      ) : null}
      <Route component={NotFound} />
    </Switch>
  );
}

function MainContent({ children, delayedAnimation, shouldAnimate }: {
  children: ReactNode;
  delayedAnimation: string | null;
  shouldAnimate: boolean;
}) {
  const { setOpen, setOpenMobile, isMobile, open, openMobile } = useSidebar();
  const outsideClickCountRef = useRef(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMainClick = () => {
    const isSidebarOpen = isMobile ? openMobile : open;
    if (!isSidebarOpen) return;

    outsideClickCountRef.current += 1;

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      outsideClickCountRef.current = 0;
    }, 10000);

    if (outsideClickCountRef.current >= 5) {
      outsideClickCountRef.current = 0;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (isMobile) {
        setOpenMobile(false);
      } else {
        setOpen(false);
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 min-w-0" onClick={handleMainClick}>
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background flex-shrink-0">
        <div className="flex items-center gap-2">
          <SidebarTrigger
            data-testid="button-sidebar-toggle"
            className={`${delayedAnimation ? delayedAnimation : ''} ${shouldAnimate ? 'animate-spin-smooth' : ''}`}
          />
        </div>
        <HeaderUserSection />
      </header>
      {children}
    </div>
  );
}

function App() {
  const [location] = useLocation();
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [delayedAnimation, setDelayedAnimation] = useState<string | null>(null);

  useEffect(() => {
    // Scroll to top when route changes
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, [location]);

  useEffect(() => {
    setShouldAnimate(true);
    const timer = setTimeout(() => {
      setShouldAnimate(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    const handleMenuItemClicked = () => {
      const animations = [
        'animate-spin-smooth',
        'animate-slide-horizontal',
        'animate-bounce-vertical',
        'animate-shake-side',
        'animate-flip-y',
        'animate-wiggle-quick',
        'animate-pulse-scale',
      ];

      const getRandomAnimation = () => {
        return animations[Math.floor(Math.random() * animations.length)];
      };

      const randomAnimation = getRandomAnimation();
      setDelayedAnimation(randomAnimation);
      
      setTimeout(() => {
        setDelayedAnimation(null);
      }, 1000);
    };

    window.addEventListener('sidebar-menu-clicked', handleMenuItemClicked);

    return () => {
      window.removeEventListener('sidebar-menu-clicked', handleMenuItemClicked);
    };
  }, []);

  const isAuthPage = location === "/welcome" || location.startsWith("/auth");

  if (isAuthPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <AuthProvider>
            <TooltipProvider>
              <div className="min-h-screen bg-background flex flex-col">
                <ElectronTitleBar />
                <header className="flex items-center justify-between px-4 py-3 border-b bg-background flex-shrink-0">
                  <div className="font-bold text-xl text-primary">KnowledgeLInk</div>
                  <ThemeToggle />
                </header>
                <main className="flex-1 flex flex-col">
                  <Router />
                </main>
                <Footer />
              </div>
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  const sidebarStyle: CSSProperties = {
    "--sidebar-width": "240px",
    "--sidebar-width-icon": "3rem",
  } as any;


  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <SidebarProvider style={sidebarStyle}>
              <div className="layout-container h-screen w-full flex flex-col overflow-hidden">
                <ElectronTitleBar />
                <div className="flex flex-1 overflow-hidden">
                <AppSidebar />
                <MainContent delayedAnimation={delayedAnimation} shouldAnimate={shouldAnimate}>
                  <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
                    <div className="flex-1">
                      <Router />
                    </div>
                    <div className="border-t mt-8 pt-2">
                      <Footer />
                    </div>
                  </main>
                </MainContent>
                </div>
              </div>
            </SidebarProvider>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
