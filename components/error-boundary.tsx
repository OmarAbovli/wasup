"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-400 via-pink-500 to-purple-600 p-4 flex items-center justify-center">
          <Card className="w-full max-w-md backdrop-blur-lg bg-white/20 border border-white/30 shadow-2xl">
            <CardHeader className="text-center">
              <AlertTriangle className="mx-auto mb-4 text-white" size={48} />
              <CardTitle className="text-xl font-bold text-white">Something went wrong</CardTitle>
              <CardDescription className="text-white/80">
                We encountered an unexpected error. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm font-semibold py-3"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
                className="w-full bg-white/10 text-white border border-white/30 hover:bg-white/20 backdrop-blur-sm font-semibold py-3"
              >
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
