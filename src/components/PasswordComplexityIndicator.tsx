import React, { useState, useEffect } from 'react';
import { 
  analyzePasswordComplexity, 
  generatePasswordSuggestions,
  getPasswordStrengthColor,
  getPasswordStrengthIcon,
  type PasswordComplexityResult 
} from '../utils/passwordComplexity';

interface PasswordComplexityIndicatorProps {
  password: string;
  showSuggestions?: boolean;
  onPasswordChange?: (password: string) => void;
}

export const PasswordComplexityIndicator: React.FC<PasswordComplexityIndicatorProps> = ({
  password,
  showSuggestions = true,
  onPasswordChange
}) => {
  const [analysis, setAnalysis] = useState<PasswordComplexityResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showPasswordSuggestions, setShowPasswordSuggestions] = useState(false);

  useEffect(() => {
    if (password) {
      const result = analyzePasswordComplexity(password);
      setAnalysis(result);
      
      if (showSuggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
      }
    } else {
      setAnalysis(null);
      setSuggestions([]);
    }
  }, [password, showSuggestions]);

  const handleGenerateSuggestions = () => {
    const newSuggestions = generatePasswordSuggestions(password);
    setSuggestions(newSuggestions);
    setShowPasswordSuggestions(true);
  };

  const handleUseSuggestion = (suggestion: string) => {
    if (onPasswordChange) {
      onPasswordChange(suggestion);
    }
    setShowPasswordSuggestions(false);
  };

  if (!analysis) {
    return null;
  }

  const strengthColor = getPasswordStrengthColor(analysis.level);
  const strengthIcon = getPasswordStrengthIcon(analysis.level);

  return (
    <div className="password-complexity-indicator">
      {/* Password Strength Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Password Strength
          </span>
          <span className="text-sm font-medium" style={{ color: strengthColor }}>
            {strengthIcon} {analysis.level.charAt(0).toUpperCase() + analysis.level.slice(1)}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${analysis.score}%`,
              backgroundColor: strengthColor
            }}
          />
        </div>
        
        <div className="text-xs text-gray-600 mt-1">
          Score: {analysis.score}/100
        </div>
      </div>

      {/* Encouragement Message */}
      <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: `${strengthColor}15` }}>
        <p className="text-sm font-medium" style={{ color: strengthColor }}>
          {analysis.encouragement}
        </p>
      </div>

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            💡 Suggestions to make your password stronger:
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {analysis.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Password Suggestions */}
      {showSuggestions && (
        <div className="mb-3">
          <button
            type="button"
            onClick={handleGenerateSuggestions}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            🔧 Generate stronger password suggestions
          </button>
          
          {showPasswordSuggestions && suggestions.length > 0 && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Suggested passwords:
              </h4>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <code className="text-sm bg-white px-2 py-1 rounded border">
                      {suggestion}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleUseSuggestion(suggestion)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security Tips */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">🔒 Security Tips:</h4>
        <ul className="space-y-1">
          <li>• Use a unique password for this account</li>
          <li>• Consider using a password manager</li>
          <li>• Don't share your password with anyone</li>
          <li>• Change your password regularly</li>
        </ul>
      </div>
    </div>
  );
};

export default PasswordComplexityIndicator;
