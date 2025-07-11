
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar";
import { LayoutDashboard, Database, Settings, BookOpen, GanttChartSquare, FileSpreadsheet, BarChart, MousePointerClick, Settings2, DatabaseZap, Repeat, XCircle, CalendarDays, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DocumentationPage() {
  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
              <div className="bg-primary p-2 rounded-lg">
                  <GanttChartSquare className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold font-headline text-foreground">VizFlow</h1>
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
                <Link href="/weekly-view">
                  <CalendarDays />
                  <span>Weekly View</span>
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
                <Link href="/manual-transactions">
                  <Repeat />
                  <span>Manual Transactions</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/exclusions">
                  <XCircle />
                  <span>Exclusions</span>
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
              <SidebarMenuButton asChild>
                <Link href="/export">
                  <Download />
                  <span>Export</span>
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
                  Welcome to <strong>VizFlow</strong>. This application is designed to provide a clear, visual representation of your cash flow based on data from an Excel or CSV file.
                </p>
                <p>
                  By uploading your financial data from the <Link href="/data" className="text-primary underline">Imported Data</Link> page, you can see a 12-week forecast of your balance, a weekly summary of incoming and outgoing funds, and drill down into specific transactions.
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
                <p className="text-muted-foreground">The application requires the following columns by default (these can be re-mapped in Settings):</p>
                <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                  <li>
                    <strong>Type</strong>: Must contain one of 'Invoice', 'Bill', 'Bill Credit', or 'Credit Memo'.
                    <ul className="list-['-_'] list-inside pl-4 mt-1">
                        <li><strong>Inflows</strong> (money in): 'Invoice', 'Bill Credit'</li>
                        <li><strong>Outflows</strong> (money out): 'Bill', 'Credit Memo'</li>
                    </ul>
                  </li>
                  <li><strong>Document Number</strong>: A unique identifier for the transaction (e.g., invoice number).</li>
                  <li><strong>Name</strong>: The name of the client or vendor.</li>
                  <li><strong>Due Date</strong>: The date the payment is due. Various formats are supported (e.g., YYYY-MM-DD, DD/MM/YYYY).</li>
                  <li><strong>Date</strong>: The transaction date. This is used as a fallback if the 'Due Date' for a row is empty.</li>
                  <li><strong>Amount</strong>: The transaction amount as a number.</li>
                  <li><strong>Remaining Amount</strong>: The open or outstanding amount of the transaction.</li>
                  <li><strong>Status</strong>: The current state of the transaction (e.g., 'Open', 'Paid', 'Unpaid'). This column is optional.</li>
                  <li><strong>Date Closed</strong>: The date a transaction was closed. Used to infer status if the 'Status' column is missing.</li>
                  <li><strong>Installment Due Date</strong>: (Optional) The specific due date for an installment. Overrides 'Due Date'.</li>
                  <li><strong>Installment Amount</strong>: (Optional) The specific amount for an installment. Overrides 'Remaining Amount'.</li>
                  <li><strong>Installment Number</strong>: (Optional) The identifier for the installment (e.g., "1/3"). If present, installment logic is triggered.</li>
                  <li><strong>Installment Status</strong>: (Optional) The status of the specific installment. Overrides 'Status'.</li>
                </ul>
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">Status-Based Filtering</h4>
                  <p className="text-muted-foreground">
                    The application automatically filters your data to ensure the forecast is accurate. Only transactions with a status of <strong>'Open'</strong>, <strong>'Unpaid'</strong>, or <strong>'Pending Approval'</strong> will be included in the cash flow analysis on the dashboard.
                  </p>
                   <p className="text-muted-foreground mt-3">
                    If the 'Status' column is not provided in your file, the app will try to infer it. If a row has a 'Date Closed', its status will be set to 'Paid'. Otherwise, it will be set to 'Unpaid'. The same logic applies to 'Installment Status' if used.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="secondary">Included: Open</Badge>
                      <Badge variant="secondary">Included: Pending Approval</Badge>
                      <Badge variant="secondary">Included: Unpaid</Badge>
                  </div>
                   <p className="text-muted-foreground mt-3">
                    All other statuses (e.g., 'Paid', 'Paid In Full', 'Cancelled', 'Rejected') will be imported but excluded from the forecast. You can view all imported data, including excluded items, on the <Link href="/data" className="text-primary underline">Imported Data</Link> page.
                  </p>
                </div>
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
                  Data Storage & Sharing
                </CardTitle>
                <CardDescription>
                  Your data privacy is paramount. The application is designed to work entirely within your browser.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                 <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>No Server Upload</strong>: Your financial data is never sent to or stored on any server. It is processed directly in your browser.</li>
                  <li><strong>Session Storage</strong>: The imported cash flow data is stored in your browser's <strong>sessionStorage</strong>. This means it is temporary and will be cleared when you close the browser tab.</li>
                  <li><strong>Local Storage</strong>: Your column mapping preferences, manual transactions, and other settings are saved in your browser's <strong>localStorage</strong>, so they persist between sessions.</li>
                  <li><strong>Session Export/Import</strong>: From the <Link href="/export" className="text-primary underline">Export</Link> page, you can download a `.json` file containing your entire application state (imported data, settings, manual transactions, etc.). This file can be shared with other users, who can then upload it on the <Link href="/data" className="text-primary underline">Imported Data</Link> page to load the exact same session.</li>
                </ul>
              </CardContent>
            </Card>

          </div>
        </main>
      </SidebarInset>
    </>
  );
}

    