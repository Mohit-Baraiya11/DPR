import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Check, FileSpreadsheet, MessageSquare, Zap, Users, ArrowRight } from 'lucide-react';

const Onboarding = ({ onComplete, user }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [sheetData, setSheetData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState('next');

  const steps = [
    {
      id: 1,
      title: `Welcome, ${user?.name || 'User'}!`,
      subtitle: "SMART DPR helps you manage construction progress through natural language. Let's get you set up in just a few steps.",
      icon: <FileSpreadsheet className="w-12 h-12 text-blue-600" />,
      content: (
        <div className="space-y-4">          
          <div className="grid gap-y-4">
            <div className="flex items-center bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-lg rounded-2xl px-6 py-5 hover:shadow-xl transition-all duration-300 group animate-in slide-in-from-left duration-700 delay-200">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-base mb-1">Natural Language</h3>
                <p className="text-gray-700 leading-relaxed">Describe what you want to update in plain English</p>
              </div>
            </div>
            
            <div className="flex items-center bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 shadow-lg rounded-2xl px-6 py-5 hover:shadow-xl transition-all duration-300 group animate-in slide-in-from-left duration-700 delay-300">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-base mb-1">AI-Powered</h3>
                <p className="text-gray-700 leading-relaxed">Smart parsing and intelligent suggestions</p>
              </div>
            </div>
            
            <div className="flex items-center bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 shadow-lg rounded-2xl px-6 py-5 hover:shadow-xl transition-all duration-300 group animate-in slide-in-from-left duration-700 delay-400">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-base mb-1">Team Ready</h3>
                <p className="text-gray-700 leading-relaxed">Works with your existing Google Sheets</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "How It Works",
      subtitle: "",
      icon: <Zap className="w-12 h-12 text-yellow-600" />,
      content: (
        <div className="space-y-8">          
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-lg rounded-2xl px-6 py-5 group hover:shadow-xl transition-all duration-300 animate-in slide-in-from-left duration-700 delay-200">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <span className="text-lg font-bold text-white">1</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-lg mb-2">Select Your Sheet</h4>
                <p className="text-gray-700 leading-relaxed mb-3">Choose from your available Google Sheets to get started</p>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="flex items-start bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 shadow-lg rounded-2xl px-6 py-5 group hover:shadow-xl transition-all duration-300 animate-in slide-in-from-left duration-700 delay-300">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <span className="text-lg font-bold text-white">2</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-lg mb-2">Describe Your Update</h4>
                <p className="text-gray-700 leading-relaxed mb-3">Tell us what you want to update in natural language</p>
              </div>
            </div>
            
            {/* Step 3 */}
            <div className="flex items-start bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 shadow-lg rounded-2xl px-6 py-5 group hover:shadow-xl transition-all duration-300 animate-in slide-in-from-left duration-700 delay-400">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <span className="text-lg font-bold text-white">3</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-lg mb-2">AI Updates Your Sheet</h4>
                <p className="text-gray-700 leading-relaxed mb-3">SMART DPR automatically finds locations, work types, and quantities</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-6 animate-in fade-in duration-700 delay-500">
            <div className="flex items-center space-x-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-3">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-700">Use <span className="font-semibold text-blue-700">voice</span> or <span className="font-semibold text-blue-700">text</span> input</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Ready to Start!",
      subtitle: "Let's select your first sheet",
      icon: <ArrowRight className="w-12 h-12 text-purple-600" />,
      content: (
        <div className="space-y-8">
          
          <div className="space-y-4">

            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-lg rounded-2xl px-6 py-5 animate-in slide-in-from-left duration-700 delay-200">
              <div className="flex items-start space-x-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg mb-2">Voice Input Support</h4>
                  <p className="text-gray-700 leading-relaxed">Try voice input for hands-free updates on the go</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 shadow-lg rounded-2xl px-6 py-5 animate-in slide-in-from-left duration-700 delay-300">
              <div className="flex items-start space-x-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg flex-shrink-0">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg mb-2">Flexible Modes</h4>
                  <p className="text-gray-700 leading-relaxed">Switch between Update and Chat modes as needed</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setDirection('next');
      setIsTransitioning(true);
      setTimeout(() => {
        setCompletedSteps([...completedSteps, currentStep]);
        setCurrentStep(currentStep + 1);
        setIsTransitioning(false);
      }, 300);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setDirection('prev');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentStepData = steps.find(step => step.id === currentStep);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 animate-in slide-in-from-top duration-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center animate-in zoom-in duration-500 delay-200">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div className="animate-in slide-in-from-left duration-700 delay-300">
              <h1 className="text-lg font-semibold text-gray-900">SMART DPR</h1>
              <p className="text-sm text-gray-500">Getting Started</p>
            </div>
          </div>
          
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 hover:scale-105 transform animate-in slide-in-from-right duration-700 delay-400"
          >
            Skip Tour
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4 animate-in slide-in-from-top duration-700 delay-500">
          <div className="flex items-center space-x-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-500 transform hover:scale-110 ${
                    completedSteps.includes(step.id)
                      ? 'bg-green-500 text-white animate-in zoom-in duration-300'
                      : step.id === currentStep
                      ? 'bg-blue-500 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {completedSteps.includes(step.id) ? (
                    <Check className="w-4 h-4 animate-in zoom-in duration-300" />
                  ) : (
                    <span className="animate-in fade-in duration-300">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 transition-all duration-500 ${
                    completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center mb-8">
            <div className={`mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 transition-all duration-700 transform ${
              isTransitioning ? 'scale-75 opacity-50' : 'scale-100 opacity-100'
            } ${direction === 'next' ? 'animate-in slide-in-from-left duration-700' : 'animate-in slide-in-from-right duration-700'}`}>
              {currentStepData.icon}
            </div>
            <h2 className={`text-3xl font-bold text-gray-900 mb-2 transition-all duration-700 ${
              isTransitioning ? 'opacity-50 translate-y-2' : 'opacity-100 translate-y-0'
            } ${direction === 'next' ? 'animate-in slide-in-from-left duration-700 delay-100' : 'animate-in slide-in-from-right duration-700 delay-100'}`}>
              {currentStepData.title}
            </h2>
            <p className={`text-lg text-gray-600 transition-all duration-700 ${
              isTransitioning ? 'opacity-50 translate-y-2' : 'opacity-100 translate-y-0'
            } ${direction === 'next' ? 'animate-in slide-in-from-left duration-700 delay-200' : 'animate-in slide-in-from-right duration-700 delay-200'}`}>
              {currentStepData.subtitle}
            </p>
          </div>
          
          <div className={`bg-white rounded-lg border border-gray-200 p-8 transition-all duration-700 ${
            isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
          } ${direction === 'next' ? 'animate-in slide-in-from-left duration-700 delay-300' : 'animate-in slide-in-from-right duration-700 delay-300'}`}>
            {currentStepData.content}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 animate-in slide-in-from-bottom duration-700 delay-600">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1 || isTransitioning}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 transform ${
              currentStep === 1 || isTransitioning
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-105 active:scale-95'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          
          <div className="text-sm text-gray-500 animate-in fade-in duration-500 delay-700">
            Step {currentStep} of {steps.length}
          </div>
          
          <button
            onClick={handleNext}
            disabled={isTransitioning}
            className={`flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg transition-all duration-200 transform ${
              isTransitioning 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-blue-700 hover:scale-105 active:scale-95 hover:shadow-lg'
            }`}
          >
            <span>{currentStep === steps.length ? 'Get Started' : 'Next'}</span>
            {currentStep === steps.length ? (
              <ArrowRight className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
