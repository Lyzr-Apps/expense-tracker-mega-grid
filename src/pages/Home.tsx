import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Receipt,
  DollarSign,
  Calendar,
  FileText,
  Filter
} from 'lucide-react'
import { callAIAgent, uploadFiles } from '@/utils/aiAgent'
import type { NormalizedAgentResponse } from '@/utils/aiAgent'

// AGENT ID from response schema
const AGENT_ID = "696f6413b50537828e0b1654"

// TypeScript interfaces based on actual test response
interface ExpenseDetails {
  vendor: string
  date: string
  amount: number
  currency: string
  category: string
  items: string[]
}

interface PolicyValidation {
  is_compliant: boolean
  violations: string[]
  warnings: string[]
  approval_required: boolean
}

interface ExpenseResult {
  expense_details: ExpenseDetails
  policy_validation: PolicyValidation
  answer: string
  recommendations: string[]
}

interface ExpenseResponse extends NormalizedAgentResponse {
  result: ExpenseResult
}

// Mock expense data for tracking table
interface TrackedExpense {
  id: string
  date: string
  vendor: string
  amount: number
  category: string
  status: 'Pending Approval' | 'Approved' | 'Rejected'
}

const EXPENSE_CATEGORIES = [
  'Travel',
  'Meals',
  'Office Supplies',
  'Software',
  'Hardware',
  'Training',
  'Other'
]

const MOCK_EXPENSES: TrackedExpense[] = [
  { id: '1', date: '2024-06-15', vendor: 'ABC Airlines', amount: 450.00, category: 'Travel', status: 'Approved' },
  { id: '2', date: '2024-06-14', vendor: 'Tech Store', amount: 1200.00, category: 'Hardware', status: 'Pending Approval' },
  { id: '3', date: '2024-06-13', vendor: 'Coffee Shop', amount: 25.50, category: 'Meals', status: 'Approved' },
  { id: '4', date: '2024-06-12', vendor: 'Office Depot', amount: 85.00, category: 'Office Supplies', status: 'Approved' },
  { id: '5', date: '2024-06-10', vendor: 'Luxury Restaurant', amount: 350.00, category: 'Meals', status: 'Rejected' },
]

// Chat message interface
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  recommendations?: string[]
}

// Submit Expense Form Component
function SubmitExpenseSection() {
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([])
  const [formData, setFormData] = useState({
    vendor: '',
    date: '',
    amount: '',
    category: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [response, setResponse] = useState<ExpenseResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setReceiptFile(file)
    setUploading(true)
    setError(null)

    try {
      const uploadResult = await uploadFiles(file)
      if (uploadResult.success) {
        setUploadedAssets(uploadResult.asset_ids)
      } else {
        setError(uploadResult.error || 'Upload failed')
      }
    } catch (err) {
      setError('Failed to upload receipt')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setResponse(null)

    try {
      // Construct message with expense details
      const message = `Process expense submission:
Vendor: ${formData.vendor}
Date: ${formData.date}
Amount: ${formData.amount}
Category: ${formData.category}
Description: ${formData.description}
${uploadedAssets.length > 0 ? 'Receipt attached.' : 'No receipt attached.'}`

      const result = await callAIAgent(
        message,
        AGENT_ID,
        uploadedAssets.length > 0 ? { assets: uploadedAssets } : undefined
      )

      if (result.success && result.response.status === 'success') {
        setResponse(result.response as ExpenseResponse)
      } else {
        setError(result.response.message || 'Submission failed')
      }
    } catch (err) {
      setError('Network error during submission')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="receipt" className="text-sm font-medium">
            Upload Receipt (Image/PDF)
          </Label>
          <div className="mt-1.5">
            <Input
              id="receipt"
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              disabled={uploading || submitting}
              className="cursor-pointer"
            />
            {uploading && (
              <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading receipt...
              </p>
            )}
            {receiptFile && !uploading && (
              <p className="text-sm text-green-600 mt-1.5 flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                {receiptFile.name} uploaded
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              value={formData.vendor}
              onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
              placeholder="e.g., ABC Cafe"
              required
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the expense"
            rows={3}
          />
        </div>

        <Button type="submit" disabled={submitting || uploading} className="w-full">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Expense
            </>
          )}
        </Button>
      </form>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {response && response.result && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Processed
            </CardTitle>
            <CardDescription>
              {response.result.policy_validation.is_compliant
                ? 'Your expense has been validated'
                : 'Issues found with your expense'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Expense Details */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Extracted Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Vendor:</span>
                  <p className="font-medium">{response.result.expense_details.vendor}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{response.result.expense_details.date}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-medium">
                    {response.result.expense_details.currency} ${response.result.expense_details.amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{response.result.expense_details.category}</p>
                </div>
              </div>
              {response.result.expense_details.items.length > 0 && (
                <div className="mt-3">
                  <span className="text-muted-foreground text-sm">Items:</span>
                  <ul className="list-disc list-inside text-sm mt-1">
                    {response.result.expense_details.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Separator />

            {/* Policy Validation */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Policy Validation</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {response.result.policy_validation.is_compliant ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Compliant
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Non-Compliant
                    </Badge>
                  )}
                  {response.result.policy_validation.approval_required && (
                    <Badge variant="secondary">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Approval Required
                    </Badge>
                  )}
                </div>

                {response.result.policy_validation.violations.length > 0 && (
                  <div className="bg-red-50 p-3 rounded-md border border-red-200">
                    <p className="text-sm font-medium text-red-900 mb-1">Violations:</p>
                    <ul className="list-disc list-inside text-sm text-red-800">
                      {response.result.policy_validation.violations.map((violation, i) => (
                        <li key={i}>{String(violation)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {response.result.policy_validation.warnings.length > 0 && (
                  <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                    <p className="text-sm font-medium text-yellow-900 mb-1">Warnings:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-800">
                      {response.result.policy_validation.warnings.map((warning, i) => (
                        <li key={i}>{String(warning)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {response.result.recommendations.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-2">Recommendations</h3>
                  <ul className="space-y-1">
                    {response.result.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Expense Tracking Component
function ExpenseTrackingSection() {
  const [expenses, setExpenses] = useState<TrackedExpense[]>(MOCK_EXPENSES)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filteredExpenses = expenses.filter(expense => {
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter
    return matchesStatus && matchesCategory
  })

  const getStatusBadge = (status: TrackedExpense['status']) => {
    switch (status) {
      case 'Approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'Pending Approval':
        return <Badge variant="secondary">Pending Approval</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="status-filter" className="text-sm">Filter by Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Pending Approval">Pending Approval</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label htmlFor="category-filter" className="text-sm">Filter by Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger id="category-filter" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No expenses found matching the selected filters
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.date}</TableCell>
                  <TableCell>{expense.vendor}</TableCell>
                  <TableCell className="text-right font-mono">
                    ${expense.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>{getStatusBadge(expense.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredExpenses.length} of {expenses.length} expenses
      </div>
    </div>
  )
}

// Policy Q&A Chat Component
function PolicyChatSection() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || loading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: question
    }

    setMessages(prev => [...prev, userMessage])
    setLoading(true)
    setError(null)

    const currentQuestion = question
    setQuestion('')

    try {
      const result = await callAIAgent(currentQuestion, AGENT_ID)

      if (result.success && result.response.status === 'success') {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: result.response.result.answer || result.response.message || 'No answer provided',
          recommendations: result.response.result.recommendations || []
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        setError(result.response.message || 'Failed to get answer')
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your question. Please try again.'
        }])
      }
    } catch (err) {
      setError('Network error')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered a network error. Please try again.'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1 p-4 border rounded-md mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Ask any questions about expense policies and guidelines</p>
            <p className="text-xs mt-1">Example: "What is the meal expense limit?"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-medium mb-1.5">Recommendations:</p>
                      <ul className="space-y-1">
                        {msg.recommendations.map((rec, j) => (
                          <li key={j} className="text-xs flex items-start gap-1.5">
                            <span className="mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSendQuestion} className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about expense policies..."
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !question.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}

// Main Home Component
export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">ExpenseFlow</h1>
              <p className="text-sm text-muted-foreground">Smart Expense Management System</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="submit" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="submit" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Submit Expense
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Expense Tracking
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Policy Q&A
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Submit New Expense
                </CardTitle>
                <CardDescription>
                  Upload your receipt and enter expense details for processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubmitExpenseSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Expense Tracking
                </CardTitle>
                <CardDescription>
                  View and filter all submitted expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseTrackingSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Policy Q&A Assistant
                </CardTitle>
                <CardDescription>
                  Ask questions about expense policies and reimbursement guidelines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PolicyChatSection />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
