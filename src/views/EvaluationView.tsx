'use client';

import { useEvaluation } from '@/context/EvaluationContext';
import { calcPartI, calcPartII, calcPartIII, calcFinalScore, getGrade, getGradeColor, getBehaviorCategoriesWithScores } from '@/types/evaluation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScoreButtons } from '@/components/ScoreButtons';
import { StatusBadge } from '@/components/StatusBadge';
import { WorkflowProgress } from '@/components/WorkflowProgress';
import { generatePDF } from '@/utils/pdfExport';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Download, ArrowLeft, ChevronDown, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';

export default function EvaluationView() {
  const { viewParams, navigate } = useEvaluation();
  const id = viewParams.id;
  const { getEvaluation, updateEvaluation, currentUser } = useEvaluation();
  const eval_ = getEvaluation(id || '');

  const [managerObjectives, setManagerObjectives] = useState(eval_?.objectives || []);
  const [managerBehaviors, setManagerBehaviors] = useState(eval_?.behaviors || []);
  const [managerAdjusting, setManagerAdjusting] = useState(eval_?.adjustingFactor || { selfScore: 0, managerScore: 0, notes: '' });
  const [hrNotes, setHrNotes] = useState(eval_?.hrNotes || '');
  const [hrRejectFeedback, setHrRejectFeedback] = useState('');

  if (!eval_) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Evaluation not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Go Back</Button>
      </div>
    );
  }

  const isManager = (currentUser.role === 'manager' || currentUser.role === 'president' || (currentUser.role === 'employee' && currentUser.canEvaluate)) && eval_.managerId === currentUser.id;
  const isAdmin = currentUser.role === 'admin';
  const isOwner = eval_.employeeId === currentUser.id;
  const canScore = isManager && eval_.status === 'submitted';
  const canHrApprove = isAdmin && eval_.status === 'manager_scored';
  const canHrReject = isAdmin && eval_.status === 'manager_scored';
  const canDownload = eval_.status === 'hr_approved' && (isOwner || isManager || isAdmin);

  const useManager = eval_.status === 'manager_scored' || eval_.status === 'hr_approved';
  const displayObjs = canScore ? managerObjectives : eval_.objectives;
  const displayBehaviors = canScore ? managerBehaviors : eval_.behaviors;
  const displayAdjusting = canScore ? managerAdjusting : eval_.adjustingFactor;

  const behaviorCategories = getBehaviorCategoriesWithScores(displayBehaviors, eval_.isLeadership);

  const selfScore = calcFinalScore(eval_, false);
  const managerScore = useManager ? calcFinalScore({ ...eval_, objectives: displayObjs, behaviors: displayBehaviors, adjustingFactor: displayAdjusting }, true) : 0;
  const finalScore = useManager ? managerScore : selfScore;

  const submitManagerScores = () => {
    const hasNoScore = managerObjectives.some(o => o.managerScore === 0) || managerBehaviors.some(b => b.managerScore === 0) || managerAdjusting.managerScore === 0;
    if (hasNoScore) {
      toast.error('Please score all items');
      return;
    }
    const nowIso = new Date().toISOString();
    updateEvaluation({
      ...eval_,
      objectives: managerObjectives,
      behaviors: managerBehaviors,
      adjustingFactor: managerAdjusting,
      status: 'manager_scored',
      updatedAt: nowIso.split('T')[0],
      auditLog: [
        ...(eval_.auditLog || []),
        {
          timestamp: nowIso,
          action: 'Manager Scored & Sent to HR',
          fromStatus: 'submitted',
          toStatus: 'manager_scored',
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
        },
      ],
    });
    toast.success('Manager scores submitted!');
    navigate('/');
  };

  const hrApprove = () => {
    const nowIso = new Date().toISOString();
    updateEvaluation({
      ...eval_,
      hrNotes,
      status: 'hr_approved',
      updatedAt: nowIso.split('T')[0],
      auditLog: [
        ...(eval_.auditLog || []),
        {
          timestamp: nowIso,
          action: 'HR Approved & Finalized',
          fromStatus: 'manager_scored',
          toStatus: 'hr_approved',
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          notes: hrNotes || undefined,
        },
      ],
    });
    toast.success('Evaluation approved!');
    navigate('/');
  };

  const hrReject = () => {
    if (!hrRejectFeedback.trim()) {
      toast.error('Please provide feedback for rejection');
      return;
    }
    const nowIso = new Date().toISOString();
    updateEvaluation({
      ...eval_,
      hrNotes: hrRejectFeedback,
      status: 'hr_rejected',
      updatedAt: nowIso.split('T')[0],
      auditLog: [
        ...(eval_.auditLog || []),
        {
          timestamp: nowIso,
          action: 'HR Rejected',
          fromStatus: 'manager_scored',
          toStatus: 'hr_rejected',
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          notes: hrRejectFeedback,
        },
      ],
    });
    toast.success('Evaluation rejected with feedback');
    navigate('/');
  };

  const updateManagerBehaviorScore = (subTopicId: string, value: number) => {
    setManagerBehaviors(prev =>
      prev.map(b => b.subTopicId === subTopicId ? { ...b, managerScore: value } : b)
    );
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{eval_.employeeName}</h1>
          <p className="text-muted-foreground">{eval_.employeeTitle} · {eval_.department} · {eval_.period}</p>
        </div>
        <StatusBadge status={eval_.status} />
        {canDownload && (
          <Button variant="outline" size="sm" onClick={() => generatePDF(eval_)}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
        )}
      </div>

      <WorkflowProgress status={eval_.status} />

      {/* HR Rejected banner */}
      {eval_.status === 'hr_rejected' && eval_.hrNotes && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">HR Rejected — Feedback:</p>
              <p className="text-sm text-muted-foreground mt-1">{eval_.hrNotes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">Part I (45%)</p>
            <p className="text-xl font-bold">{calcPartI(displayObjs, useManager).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">Part II (45%)</p>
            <p className="text-xl font-bold">{calcPartII(displayBehaviors, useManager).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">Part III (10%)</p>
            <p className="text-xl font-bold">{calcPartIII(displayAdjusting, useManager).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">Final Score</p>
            <p className={`text-2xl font-bold ${getGradeColor(finalScore)}`}>{finalScore.toFixed(2)}</p>
            <p className={`text-xs font-medium ${getGradeColor(finalScore)}`}>{getGrade(finalScore)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Part I */}
      <Card>
        <CardHeader><CardTitle className="text-base">Part I — Personal Objectives</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Objective</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Weight</th>
                  <th className="pb-2 font-medium">Self</th>
                  <th className="pb-2 font-medium">Manager</th>
                </tr>
              </thead>
              <tbody>
                {displayObjs.map((o, i) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-3">{i + 1}</td>
                    <td className="py-3">{o.description}</td>
                    <td className="py-3 capitalize">{o.category}</td>
                    <td className="py-3">{o.weight}%</td>
                    <td className="py-3 font-medium">{o.selfScore || '—'}</td>
                    <td className="py-3">
                      {canScore ? (
                        <ScoreButtons
                          value={managerObjectives[i]?.managerScore || 0}
                          onChange={v => {
                            const newObjs = [...managerObjectives];
                            newObjs[i] = { ...newObjs[i], managerScore: v };
                            setManagerObjectives(newObjs);
                          }}
                        />
                      ) : (
                        <span className="font-medium">{o.managerScore || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Part II */}
      <Card>
        <CardHeader><CardTitle className="text-base">Part II — Core Values & Behaviors</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {behaviorCategories.map((cat, catIdx) => (
            <div key={cat.name}>
              <h3 className="font-semibold text-sm mb-3">
                {catIdx + 1}. {cat.name.toUpperCase()}
                {cat.leadershipOnly && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">(Leadership roles only)</span>
                )}
              </h3>
              <div className="space-y-3 ml-2">
                {cat.subTopics.map((st, stIdx) => (
                  <div key={st.id} className="border rounded-lg p-4">
                    <Collapsible defaultOpen>
                      <CollapsibleTrigger className="flex items-center gap-2 text-left group w-full">
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                        <p className="font-medium text-sm">{catIdx + 1}.{stIdx + 1} {st.name}</p>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <ul className="space-y-1 ml-6 mb-3">
                          {st.bullets.map((bullet, bi) => (
                            <li key={bi} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="mt-1 shrink-0">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                    <div className="flex items-center justify-between flex-wrap gap-3 mt-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Self</p>
                        <p className="font-bold">{st.selfScore || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Manager</p>
                        {canScore ? (
                          <ScoreButtons
                            value={displayBehaviors.find(b => b.subTopicId === st.id)?.managerScore || 0}
                            onChange={v => updateManagerBehaviorScore(st.id, v)}
                          />
                        ) : (
                          <p className="font-bold">{st.managerScore || '—'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Part III */}
      <Card>
        <CardHeader><CardTitle className="text-base">Part III — Adjusting Factors</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Self Score</p>
              <p className="font-bold text-lg">{displayAdjusting.selfScore || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Manager Score</p>
              {canScore ? (
                <ScoreButtons
                  value={managerAdjusting.managerScore}
                  onChange={v => setManagerAdjusting(prev => ({ ...prev, managerScore: v }))}
                />
              ) : (
                <p className="font-bold text-lg">{displayAdjusting.managerScore || '—'}</p>
              )}
            </div>
          </div>
          {displayAdjusting.notes && (
            <div>
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm mt-1">{displayAdjusting.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manager submit */}
      {canScore && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={submitManagerScores}>Submit Manager Scores</Button>
        </div>
      )}

      {/* HR Approve/Reject */}
      {(canHrApprove || canHrReject) && (
        <Card className="border-warning/50">
          <CardHeader><CardTitle className="text-base">HR Review</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">HR Notes / Comments</p>
              <Textarea
                placeholder="HR notes and comments..."
                value={hrNotes}
                onChange={e => setHrNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Rejection Feedback <span className="text-xs text-muted-foreground">(required if rejecting)</span></p>
              <Textarea
                placeholder="Feedback for employee and manager (required for rejection)..."
                value={hrRejectFeedback}
                onChange={e => setHrRejectFeedback(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="destructive" onClick={hrReject}>Reject</Button>
              <Button onClick={hrApprove}>Approve & Finalize</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HR Notes display (approved) */}
      {eval_.status === 'hr_approved' && eval_.hrNotes && (
        <Card>
          <CardHeader><CardTitle className="text-base">HR Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{eval_.hrNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
