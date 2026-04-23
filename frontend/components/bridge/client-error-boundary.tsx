"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Component, type ErrorInfo, type ReactNode } from "react"

type Props = { children: ReactNode }

type State = { error: Error | null }

/**
 * Catches render-time failures from child components (e.g. after surfacing
 * a failed client fetch in state and throwing). Pair with the route `error.tsx`
 * for full-stack coverage.
 */
export class ClientErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ClientErrorBoundary", error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>Client call failed</CardTitle>
            <CardDescription>
              An error occurred while using this block. The route-level error
              boundary still covers server data loading.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm break-words font-mono text-muted-foreground">
              {this.state.error.message}
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => this.setState({ error: null })}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}
