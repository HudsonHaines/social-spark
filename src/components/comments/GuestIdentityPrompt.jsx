// src/components/comments/GuestIdentityPrompt.jsx
import React, { useState } from 'react';
import { User, Mail, LogIn } from 'lucide-react';

const cx = (...a) => a.filter(Boolean).join(" ");

const GuestIdentityPrompt = ({ onGuestIdentity, onLoginRequest, onCancel }) => {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    
    onGuestIdentity({
      display_name: guestName.trim(),
      email: guestEmail.trim() || null
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Who's providing this feedback?
          </h3>
          <p className="text-sm text-gray-600">
            Help us identify your comments by providing your name.
          </p>
        </div>

        {!showLogin ? (
          <form onSubmit={handleGuestSubmit} className="space-y-4">
            {/* Guest Identity Form */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your name *
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Sarah Johnson"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="sarah@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional - for follow-up communication
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!guestName.trim()}
                className={cx(
                  "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
                  guestName.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                )}
              >
                Continue as Guest
              </button>
            </div>

            {/* Login Option */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign in instead
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Login Form - Simple for now */}
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <LogIn className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Sign in to your account</h4>
              <p className="text-sm text-gray-600 mb-4">
                Sign in to leave internal team comments and access full features.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={onLoginRequest}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue to Sign In
                </button>
                
                <button
                  onClick={() => setShowLogin(false)}
                  className="w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Back to Guest Option
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestIdentityPrompt;