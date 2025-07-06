import React from 'react';

interface ConfirmationButtonsProps {
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmationButtons({ 
  onConfirm, 
  onCancel, 
  isLoading = false 
}: ConfirmationButtonsProps) {
  return (
    <div className="flex gap-3 mt-4">
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Confirmation...
          </>
        ) : (
          '✅ Confirmer'
        )}
      </button>
      
      <button
        onClick={onCancel}
        disabled={isLoading}
        className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
      >
        ❌ Annuler
      </button>
    </div>
  );
} 