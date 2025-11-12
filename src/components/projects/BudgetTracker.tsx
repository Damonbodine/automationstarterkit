'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DollarSign, Edit2, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/database';

type Project = Database['public']['Tables']['projects']['Row'];

interface BudgetTrackerProps {
  project: Project;
}

export function BudgetTracker({ project }: BudgetTrackerProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [budgetData, setBudgetData] = useState({
    budget: project.budget?.toString() || '',
    currency: project.budget_currency || 'USD',
  });

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: budgetData.budget ? parseFloat(budgetData.budget) : null,
          budget_currency: budgetData.currency,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update budget');
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating budget:', error);
      alert('Failed to update budget. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setBudgetData({
      budget: project.budget?.toString() || '',
      currency: project.budget_currency || 'USD',
    });
    setIsEditing(false);
  };

  const budget = project.budget || 0;
  const actualSpent = 0; // TODO: Calculate from expenses table when implemented
  const remaining = budget - actualSpent;
  const percentSpent = budget > 0 ? (actualSpent / budget) * 100 : 0;

  const getHealthColor = () => {
    if (percentSpent > 100) return 'text-red-600 dark:text-red-400';
    if (percentSpent > 90) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <Card className="dark:border-gray-800 dark:bg-gray-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget
          </CardTitle>
          {!isEditing ? (
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isLoading}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isLoading}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Budget Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={budgetData.budget}
                onChange={(e) => setBudgetData({ ...budgetData, budget: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency
              </label>
              <select
                value={budgetData.currency}
                onChange={(e) => setBudgetData({ ...budgetData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>
        ) : (
          <>
            {!budget ? (
              <div className="text-center py-6 text-sm text-gray-600 dark:text-gray-400">
                No budget set for this project.
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    Set Budget
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Budget Overview */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Budget</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {project.budget_currency || 'USD'} {budget.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Spent</div>
                    <div className={`text-lg font-semibold ${getHealthColor()}`}>
                      {project.budget_currency || 'USD'} {actualSpent.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remaining</div>
                    <div className={`text-lg font-semibold ${getHealthColor()}`}>
                      {project.budget_currency || 'USD'} {remaining.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Budget Used</span>
                    <span className={getHealthColor()}>{percentSpent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        percentSpent > 100
                          ? 'bg-red-600'
                          : percentSpent > 90
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(percentSpent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Note about expense tracking */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <div className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>Note:</strong> Expense tracking is coming soon. For now, budget tracking shows
                    planned budget only.
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
