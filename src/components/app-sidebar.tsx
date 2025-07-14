
"use client";

import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Database,
  Settings,
  BookOpen,
  GanttChartSquare,
  Repeat,
  XCircle,
  CalendarDays,
  Download,
  Users,
  Medal,
  BookUser,
} from 'lucide-react';

interface AppSidebarProps {
  activePage:
    | 'dashboard'
    | 'weekly-view'
    | 'customer-scorecard'
    | 'balance-summary'
    | 'data'
    | 'manual-transactions'
    | 'exclusions'
    | 'intercompany'
    | 'settings'
    | 'export'
    | 'documentation';
}

export function AppSidebar({ activePage }: AppSidebarProps) {
    return (
        <Sidebar>
            <SidebarHeader>
            <div className="flex items-center gap-2">
                <div className="bg-primary p-2 rounded-lg">
                    <GanttChartSquare className="w-6 h-6 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-semibold font-headline text-foreground">Cashflow JS</h1>
            </div>
            </SidebarHeader>
            <SidebarContent>
            <SidebarMenu>
                <SidebarGroupLabel>Analysis</SidebarGroupLabel>
                <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activePage === 'dashboard'}>
                    <Link href="/">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activePage === 'weekly-view'}>
                    <Link href="/weekly-view">
                    <CalendarDays />
                    <span>Weekly View</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activePage === 'customer-scorecard'}>
                    <Link href="/customer-scorecard">
                    <Medal />
                    <span>Customer Scorecard</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activePage === 'balance-summary'}>
                    <Link href="/balance-summary">
                    <BookUser />
                    <span>Balance Summary</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarGroupLabel>Data Management</SidebarGroupLabel>
                <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activePage === 'data'}>
                    <Link href="/data">
                    <Database />
                    <span>Imported Data</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activePage === 'manual-transactions'}>
                    <Link href="/manual-transactions">
                    <Repeat />
                    <span>Manual Transactions</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activePage === 'exclusions'}>
                    <Link href="/exclusions">
                    <XCircle />
                    <span>Exclusions</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activePage === 'intercompany'}>
                    <Link href="/intercompany">
                    <Users />
                    <span>Intercompany</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarGroupLabel>Configuration</SidebarGroupLabel>
                <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activePage === 'settings'}>
                    <Link href="/settings">
                    <Settings />
                    <span>Settings</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activePage === 'export'}>
                    <Link href="/export">
                    <Download />
                    <span>Export</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarGroupLabel>Support</SidebarGroupLabel>
                <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activePage === 'documentation'}>
                    <Link href="/documentation">
                    <BookOpen />
                    <span>Documentation</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
            </SidebarContent>
        </Sidebar>
    );
}

    