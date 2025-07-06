import React from 'react';

interface FormattedResultProps {
  content: string;
  type?: 'success' | 'error' | 'info';
}

export const FormattedResult: React.FC<FormattedResultProps> = ({ 
  content, 
  type = 'info' 
}) => {
  // Détecter automatiquement le type basé sur le contenu
  const detectType = (text: string): 'success' | 'error' | 'info' => {
    if (text.includes('🎉') || text.includes('✅') || text.includes('Excellent')) {
      return 'success';
    }
    if (text.includes('❌') || text.includes('Erreur') || text.includes('échec')) {
      return 'error';
    }
    return 'info';
  };

  const finalType = type === 'info' ? detectType(content) : type;

  const getContainerClasses = () => {
    const baseClasses = 'p-4 rounded-lg border-l-4 shadow-sm';
    
    switch (finalType) {
      case 'success':
        return `${baseClasses} bg-green-50 border-green-400 text-green-800`;
      case 'error':
        return `${baseClasses} bg-red-50 border-red-400 text-red-800`;
      case 'info':
      default:
        return `${baseClasses} bg-blue-50 border-blue-400 text-blue-800`;
    }
  };

  const getIcon = () => {
    switch (finalType) {
      case 'success':
        return '🎉';
      case 'error':
        return '❌';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  // Formater le contenu pour préserver les sauts de ligne et les emojis
  const formatContent = (text: string) => {
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className={getContainerClasses()}>
      <div className="flex items-start space-x-3">
        <span className="text-xl flex-shrink-0">{getIcon()}</span>
        <div className="flex-1">
          <div className="text-sm font-medium">
            {formatContent(content)}
          </div>
        </div>
      </div>
    </div>
  );
}; 