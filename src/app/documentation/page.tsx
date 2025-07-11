
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, Database, Settings, BookOpen, GanttChartSquare, FileSpreadsheet, BarChart, MousePointerClick, Settings2, DatabaseZap } from 'lucide-react';

export default function DocumentationPage() {
  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
              <div className="bg-primary p-2 rounded-lg">
                  <GanttChartSquare className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold font-headline text-foreground">TerraRoc Cashflow</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/data">
                  <Database />
                  <span>Imported Data</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive>
                <Link href="/documentation">
                  <BookOpen />
                  <span>Documentation</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <main className="p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold font-headline text-foreground">Documentation</h1>
              <SidebarTrigger />
          </div>
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <GanttChartSquare className="w-6 h-6" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  Welcome to <strong>TerraRoc Cashflow</strong>. This application is designed to provide a clear, visual representation of your cash flow based on data from an Excel or CSV file.
                </p>
                <p>
                  By uploading your financial data, you can see a 12-week forecast of your balance, a weekly summary of incoming and outgoing funds, and drill down into specific transactions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6" />
                  File Format Requirements
                </CardTitle>
                <CardDescription>
                  For the application to parse your data correctly, your file must contain specific columns.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">The application requires the following columns by default:</p>
                <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                  <li><strong>Type</strong>: Must contain either 'Invoice' (for money coming in) or 'Bill' (for money going out).</li>
                  <li><strong>Document Number</strong>: A unique identifier for the transaction (e.g., invoice number).</li>
                  <li><strong>Name</strong>: The name of the client or vendor.</li>
                  <li><strong>Due Date</strong>: The date the payment is due. Various formats are supported (e.g., YYYY-MM-DD, DD/MM/YYYY).</li>
                  <li><strong>Amount</strong>: The transaction amount as a number.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Settings2 className="w-6 h-6" />
                  Custom Column Mapping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  If your file uses different column names (e.g., 'Client' instead of 'Name'), you can map them in the <Link href="/settings" className="text-primary underline">Settings</Link> page.
                </p>
                <p>
                  Simply enter the column names from your file into the corresponding fields and save the changes. These settings are saved in your browser for future use.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <MousePointerClick className="w-6 h-6" />
                  Interacting with Your Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>
                  The dashboard is designed to be interactive:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>Balance Chart</strong>: Click on any data point in the line chart to open a dialog with a detailed breakdown of that week's transactions.</li>
                  <li><strong>Weekly Summary Table</strong>: Click on any row in the summary table to see the same weekly breakdown.</li>
                  <li><strong>Weekly Details Dialog</strong>: Inside the dialog, transactions are grouped by customer/vendor. Click on a name to expand the view and see the individual invoices or bills that make up their total for that week.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <DatabaseZap className="w-6 h-6" />
                  Data Storage
                </CardTitle>
                <CardDescription>
                  Your data privacy is paramount. The application is designed to work entirely within your browser.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>No Server Upload</strong>: Your financial data is never sent to or stored on any server. It is processed directly in your browser.</li>
                  <li><strong>Session Storage</strong>: The imported cash flow data is stored in your browser's <strong>sessionStorage</strong>. This means it is temporary and will be cleared when you close the browser tab.</li>
                  <li><strong>Local Storage</strong>: Your column mapping preferences from the Settings page are saved in your browser's <strong>localStorage</strong>, so they persist between sessions.</li>
                </ul>
              </CardContent>
            </Card>

          </div>
        </main>
      </SidebarInset>
    </>
  );
}
