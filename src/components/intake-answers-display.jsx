import React from 'react';
import { FileText, CheckCircle, MessageSquare } from 'lucide-react';

const IntakeAnswersDisplay = ({ intakeAnswers = [] }) => {
  
  if (!intakeAnswers || intakeAnswers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-4">
        <h3 className="font-semibold text-[var(--sf-text-primary)] mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-[var(--sf-text-muted)]" />
          Customer Questions & Answers
        </h3>
        <div className="py-4">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-[var(--sf-text-muted)] text-center">No intake questions were answered for this job</p>
        </div>
      </div>
    );
  }

  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case 'dropdown':
        return '📋';
      case 'multiple_choice':
        return '☑️';
      case 'picture_choice':
        return '🖼️';
      case 'short_text':
        return '📝';
      case 'long_text':
        return '📄';
      case 'color_choice':
        return '🎨';
      case 'image_upload':
        return '📸';
      default:
        return '❓';
    }
  };

  const formatAnswer = (answer, questionType) => {
    if (!answer) return 'No answer provided';
    
    // Parse JSON strings back to arrays/objects for multiple choice and dropdown questions
    let parsedAnswer = answer;
    if (typeof answer === 'string' && (questionType === 'multiple_choice' || questionType === 'dropdown')) {
      try {
        const parsed = JSON.parse(answer);
        if (Array.isArray(parsed)) {
          parsedAnswer = parsed;
        }
      } catch (e) {
        // Failed to parse answer as JSON, treating as string
      }
    }
    
    // Handle picture choice - parse JSON if it's a string
    if (questionType === 'picture_choice') {
      let parsedAnswer = answer;
      if (typeof answer === 'string') {
        try {
          parsedAnswer = JSON.parse(answer);
        } catch (e) {
          return answer; // Return as-is if parsing fails
        }
      }
      
      // Now handle the parsed object
      if (typeof parsedAnswer === 'object' && parsedAnswer.text) {
        return (
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            {parsedAnswer.image && (
              <img 
                src={parsedAnswer.image} 
                alt={parsedAnswer.text} 
                className="w-16 h-16 object-cover rounded border border-[var(--sf-border-light)] shadow-sm" 
              />
            )}
            <span className="text-sm text-[var(--sf-text-primary)] font-medium">{parsedAnswer.text}</span>
          </div>
        );
      } else {
        // Fallback for old format (just text)
        return <span className="text-sm text-[var(--sf-text-primary)]">{answer}</span>;
      }
    }
    
    // Handle multiple choice and dropdown questions with multiple selections
    if ((questionType === 'multiple_choice' || questionType === 'dropdown') && Array.isArray(parsedAnswer)) {
      return parsedAnswer.join(', ');
    }
    
    if (questionType === 'image_upload' && answer.startsWith('http')) {
      return (
        <div className="mt-2">
          <img 
            src={answer} 
            alt="Uploaded image" 
            className="w-32 h-32 object-cover rounded border border-[var(--sf-border-light)] shadow-sm" 
          />
          <p className="text-xs text-[var(--sf-text-muted)] mt-1">Image uploaded</p>
        </div>
      );
    }
    
    if (questionType === 'color_choice') {
      // Handle both single color and array of colors
      let colors = [];
      if (typeof answer === 'string') {
        try {
          // Try to parse as JSON array
          const parsed = JSON.parse(answer);
          if (Array.isArray(parsed)) {
            colors = parsed;
          } else if (answer.startsWith('#')) {
            // Single color
            colors = [answer];
          }
        } catch (e) {
          // If parsing fails, check if it's a single color
          if (answer.startsWith('#')) {
            colors = [answer];
          }
        }
      } else if (Array.isArray(answer)) {
        colors = answer;
      }
      
      if (colors.length > 0) {
        return (
          <div className="flex flex-wrap gap-3">
            {colors.map((color, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-[var(--sf-bg-page)] rounded-lg border border-[var(--sf-border-light)]">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-[var(--sf-border-light)] shadow-sm flex-shrink-0" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-[var(--sf-text-primary)] font-mono truncate">{color}</span>
              </div>
            ))}
          </div>
        );
      }
    }
    
    return <span className="text-sm text-[var(--sf-text-primary)]">{answer}</span>;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-4">
      <h3 className="font-semibold text-[var(--sf-text-primary)] mb-4 flex items-center">
        <MessageSquare className="w-5 h-5 mr-2 text-[var(--sf-text-muted)]" />
        Customer Questions & Answers
      </h3>
      
      <div className="space-y-4">
        {intakeAnswers.map((qa, index) => {
          return (
            <div key={index} className="border border-[var(--sf-border-light)] rounded-lg p-4 bg-[var(--sf-bg-page)] hover:bg-[var(--sf-bg-hover)] transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="flex-shrink-0 flex justify-center sm:justify-start">
                  <span className="text-lg">{getQuestionTypeIcon(qa.question_type)}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 mb-3">
                    <h4 className="text-sm font-semibold text-[var(--sf-text-primary)]">
                      {qa.question_text}
                    </h4>
                    <span className="text-xs text-[var(--sf-text-secondary)] bg-gray-200 px-2 py-1 rounded-full font-medium self-start sm:self-auto">
                      {qa.question_type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="bg-white border border-[var(--sf-border-light)] rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-[var(--sf-text-primary)]">
                      {formatAnswer(qa.answer, qa.question_type)}
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-[var(--sf-text-muted)] flex items-center justify-center sm:justify-start">
                    <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                    Answered on {new Date(qa.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-[var(--sf-border-light)]">
        <div className="flex items-center justify-center sm:justify-start text-sm text-[var(--sf-text-secondary)]">
          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
          <span className="font-medium">{intakeAnswers.length} question{intakeAnswers.length !== 1 ? 's' : ''} answered</span>
        </div>
      </div>
    </div>
  );
};

export default IntakeAnswersDisplay;
