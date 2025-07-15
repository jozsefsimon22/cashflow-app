
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/app-sidebar';
import { GanttChartSquare, FileSpreadsheet, Settings2, MousePointerClick, DatabaseZap, LayoutDashboard, CalendarDays, Medal, BookUser, Repeat, XCircle, Users, Link2, Download, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DocumentationPage() {
  return (
    <>
      <AppSidebar activePage="documentation" />
      <SidebarInset>
        <main className="p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold font-headline text-foreground">Documentation</h1>
              </div>
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
                  Welcome to <strong>Cashflow JS</strong>. This application is designed to provide a clear, visual, and interactive analysis of your cash flow. By uploading your financial data, you can generate a 12-week forecast, analyze customer payment behavior, and manage complex financial scenarios with ease.
                </p>
                <p>
                   The application is divided into three main sections: <strong>Analysis</strong> for visualizing your data, <strong>Data Management</strong> for inputting and refining your data sources, and <strong>Configuration</strong> for customizing the application to your needs.
                </p>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Analysis Pages</CardTitle>
                    <CardDescription>
                        These pages provide different ways to visualize and interact with your cash flow forecast.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-start gap-4">
                        <LayoutDashboard className="w-7 h-7 text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold text-lg text-foreground">Dashboard</h3>
                            <p className="text-muted-foreground">The main landing page, offering a high-level overview. It includes a 12-week balance forecast chart, summary cards for key metrics, and charts breaking down receivables and payables by type (Standard, Intercompany, Manual). It also features toggles for <Badge variant="outline" className="text-amber-600 border-amber-500"><Sparkles className="w-3 h-3 mr-1"/>Predicted Cashflow</Badge> and <Badge variant="outline">Exclusions</Badge>.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <CalendarDays className="w-7 h-7 text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold text-lg text-foreground">Weekly View</h3>
                            <p className="text-muted-foreground">A detailed grid view of your cash flow, broken down by category (Accounts Receivable, Accounts Payable, etc.) for each of the next 12 weeks. Clicking any monetary value opens a dialog with the underlying transaction details.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <Medal className="w-7 h-7 text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold text-lg text-foreground">Customer Scorecard</h3>
                            <p className="text-muted-foreground">Analyzes and scores customers based on their historical payment behavior. It calculates on-time payment percentages and average days late, providing insights into which customers are reliable payers. Click a customer to see their paid invoice history.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <BookUser className="w-7 h-7 text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold text-lg text-foreground">Balance Summary</h3>
                            <p className="text-muted-foreground">Consolidates all transactions to show a net balance for every entity (customer/vendor). It uses data from the Name Pairing page to merge related accounts. Clicking an entity's name opens a dialog showing a full breakdown of their receivables and payables.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Data Management Pages</CardTitle>
                    <CardDescription>
                        These pages are for inputting data, refining it, and managing specific financial rules for your forecast.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="flex items-start gap-4">
                        <DatabaseZap className="w-7 h-7 text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold text-lg text-foreground">Imported Data</h3>
                            <p className="text-muted-foreground">The starting point of the application. Upload an Excel file (.xlsx, .xls, .csv), or a previously exported session file (.json) here. The page includes a table to view all raw data from your file.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Repeat className="w-7 h-7 text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold text-lg text-foreground">Manual Transactions</h3>
                            <p className="text-muted-foreground">Add one-off or recurring transactions (e.g., rent, salaries, subscriptions) that are not present in your imported file. You can configure start dates, frequency, and end conditions. A history page allows you to manage past-due occurrences.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <XCircle className="w-7 h-7 text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold text-lg text-foreground">Exclusions</h3>
                            <p className="text-muted-foreground">Select names from your data to completely exclude from all forecast calculations. This is useful for removing test data or irrelevant entities without altering your source file.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <Users className="w-7 h-7 text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold text-lg text-foreground">Intercompany</h3>
                            <p className="text-muted-foreground">Tag specific names as "Intercompany". This allows for separate tracking and analysis in the breakdown charts on the Dashboard and in the Weekly View grid.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <Link2 className="w-7 h-7 text-primary mt-1" />
                        <div>
                            <h3 className="font-semibold text-lg text-foreground">Name Pairing</h3>
                            <p className="text-muted-foreground">Link receivable names with their corresponding payable names. This is crucial for entities that are both a customer and a vendor, allowing the Balance Summary page to show a true, consolidated net balance. The app can auto-suggest pairs based on name similarity.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6" />
                  File Format Requirements
                </CardTitle>
                <CardDescription>
                  For the application to parse your data correctly, your file must contain specific columns. These can be re-mapped in Settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">The application requires the following columns:</p>
                <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                  <li><strong>Type</strong>: Must contain one of 'Invoice', 'Bill', 'Bill Credit', or 'Credit Memo'.</li>
                  <li><strong>Document Number</strong>: A unique identifier for the transaction.</li>
                  <li><strong>Name</strong>: The name of the client or vendor.</li>
                  <li><strong>Due Date</strong>: The date the payment is due.</li>
                  <li><strong>Date</strong>: A fallback transaction date if 'Due Date' is empty.</li>
                  <li><strong>Amount</strong>: The original transaction amount.</li>
                  <li><strong>Remaining Amount</strong>: The open or outstanding amount.</li>
                </ul>
                 <p className="text-muted-foreground">The following columns are optional but recommended for full functionality:</p>
                 <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                  <li><strong>Status</strong>: The current state (e.g., 'Open', 'Paid'). If missing, it's inferred from 'Date Closed'.</li>
                  <li><strong>Date Closed</strong>: The date a transaction was paid. Used for status inference and customer payment analysis.</li>
                  <li><strong>Installment Columns</strong>: If your data has installment-based payments, you can map columns for Installment Due Date, Amount, Number, and Status to override the main transaction fields.</li>
                </ul>
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">Status-Based Filtering</h4>
                  <p className="text-muted-foreground">
                    Only transactions with a status of <strong>'Open'</strong>, <strong>'Unpaid'</strong>, or <strong>'Pending Approval'</strong> are included in the forecast. All other statuses are ignored in calculations but are still visible on the <Link href="/data" className="text-primary underline">Imported Data</Link> page.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Configuration &amp; Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                    <Settings2 className="w-7 h-7 text-primary mt-1" />
                    <div>
                        <h3 className="font-semibold text-lg text-foreground">Settings</h3>
                        <p className="text-muted-foreground">Configure your starting bank balance and map the column names from your file to the fields the application expects. Date format preferences can also be set here.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <Download className="w-7 h-7 text-primary mt-1" />
                    <div>
                        <h3 className="font-semibold text-lg text-foreground">Export</h3>
                        <div className="text-muted-foreground">
                            <p>Download your data in two ways:</p>
                            <ul className="list-['-_'] list-inside pl-4 mt-1">
                                <li><strong>To Excel</strong>: Exports the 12-week summary forecast.</li>
                                <li><strong>To JSON</strong>: Exports your entire session (imported data, all settings, manual transactions, etc.). This file can be shared and re-uploaded by another user to perfectly replicate your session.</li>
                            </ul>
                        </div>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <DatabaseZap className="w-7 h-7 text-primary mt-1" />
                    <div>
                        <h3 className="font-semibold text-lg text-foreground">Data Storage</h3>
                        <p className="text-muted-foreground">The application works entirely in your browser. Raw imported data is stored in <strong>sessionStorage</strong> (cleared when the tab closes). All settings, manual transactions, and name pairings are stored in <strong>localStorage</strong> (persists between sessions).</p>
                    </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </main>
      </SidebarInset>
    </>
  );
}
