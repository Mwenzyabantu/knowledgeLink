import { Home, MessageSquare, BookOpen, History, Settings, Lightbulb, TrendingUp, FolderOpen, Library, UserCog, LogOut, Loader2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AuthContext } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useContext } from "react";

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
  const authContext = useContext(AuthContext);
  const { user, logoutMutation } = authContext || { 
    user: null, 
    logoutMutation: { mutateAsync: async () => {}, isPending: false } as any 
  };
  
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
    
    setOpenMobile(false);
    setOpen(false);
    
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('sidebar-menu-clicked'));
    }, 100);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold px-3 py-2">
            KnowledgeLink.
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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
              variant="default"
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
