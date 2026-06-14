import { Home, MessageSquare, BookOpen, History, Settings, Lightbulb, TrendingUp, FolderOpen, Library, UserCog, LogOut, Loader2, Wand2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "AI Companion",
    url: "/ai-companion",
    icon: MessageSquare,
  },
  {
    title: "Knowledge Base",
    url: "/knowledge",
    icon: BookOpen,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderOpen,
  },
  {
    title: "Build on Idea",
    url: "/ideas",
    icon: Wand2,
  },
  {
    title: "Insights",
    url: "/insights",
    icon: Lightbulb,
  },
  {
    title: "History",
    url: "/history",
    icon: History,
  },
  {
    title: "Trends",
    url: "/trends",
    icon: TrendingUp,
  },
  {
    title: "Resources",
    url: "/resources",
    icon: Library,
  },
  {
    title: "Personalize",
    url: "/personalize",
    icon: UserCog,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { setOpen, setOpenMobile, isMobile, state } = useSidebar();
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      window.location.href = "/welcome";
    } catch (error) {
      // Error handled by use-auth
    }
  };

  const handleMenuItemClick = (url: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setLocation(url);
    
    // Always close sidebar on navigation for better UX, especially on mobile
    if (isMobile) {
      setOpenMobile(false);
    } else {
      // For desktop, we can collapse it to icon mode if that's the preferred behavior
      // or just leave it if the user wants it pinned. 
      // Based on "stopped closing on its own", they likely want it to collapse.
      setOpen(false);
    }
    
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('sidebar-menu-clicked'));
    }, 800);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="KnowledgeLink"
                  className="mb-1 font-semibold"
                  data-testid="link-home-logo"
                >
                  <a href="/dashboard" onClick={(e) => handleMenuItemClick("/dashboard", e)}>
                    <img src="/favicon.png" alt="Logo" className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-semibold">KnowledgeLink</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                    data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}
                  >
                    <a href={item.url} onClick={(e) => handleMenuItemClick(item.url, e)}>
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="w-full justify-start gap-3 hover:text-destructive text-muted-foreground group-data-[collapsible=icon]:justify-center"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              tooltip="Log Out"
              data-testid="button-logout-sidebar"
            >
              {logoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <LogOut className="h-4 w-4 shrink-0" />
              )}
              <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
