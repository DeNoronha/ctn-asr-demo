import React from 'react';

interface ConfidenceScoreProps {
  score: number;
  fieldName?: string;
}

export const ConfidenceScore: React.FC<ConfidenceScoreProps> = ({ score, fieldName }) => {
  const getColor = () => {
    if (score >= 0.8) return '#28a745'; // green
    if (score >= 0.5) return '#ffc107'; // yellow
    return '#dc3545'; // red
  };

  const getLabel = () => {
    if (score >= 0.8) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  };

  const getTooltip = () => {
    const percentage = (score * 100).toFixed(0);
    const confidence = getLabel();
    let explanation = '';

    if (score >= 0.8) {
      explanation = 'Claude is very certain about this extraction. No review needed.';
    } else if (score >= 0.5) {
      explanation = 'Claude has moderate confidence. Review recommended.';
    } else {
      explanation = 'Claude has low confidence. Manual verification required.';
    }

    return `Confidence: ${percentage}% (${confidence})\n${explanation}`;
  };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: getColor(),
        color: 'white',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: 'help',
        marginLeft: '8px'
      }}
      title={getTooltip()}
      role="status"
      aria-label={`${(score * 100).toFixed(0)}% confidence${fieldName ? ` for ${fieldName}` : ''}`}
    >
      {(score * 100).toFixed(0)}%
    </span>
  );
};
