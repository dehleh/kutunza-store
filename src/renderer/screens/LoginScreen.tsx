import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Lock, User, ArrowRight } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { login, setSession } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOpeningCash, setShowOpeningCash] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const handlePinClear = () => {
    setPin('');
  };

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleLogin = async () => {
    if (!username || !pin) {
      toast.error('Please enter username and PIN');
      return;
    }

    setIsLoading(true);
    try {
      const user = await window.api.users.login(username, pin);
      
      if (user) {
        setLoggedInUser(user);
        
        // Check for existing session
        const existingSession = await window.api.sessions.getActive(user.id);
        
        if (existingSession) {
          login(user);
          setSession(existingSession);
          toast.success(`Welcome back, ${user.firstName}!`);
          navigate('/pos');
        } else {
          // Show opening cash dialog
          setShowOpeningCash(true);
        }
      } else {
        toast.error('Invalid username or PIN');
        setPin('');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async () => {
    if (!loggedInUser) return;

    setIsLoading(true);
    try {
      const cash = parseFloat(openingCash) || 0;
      const session = await window.api.sessions.start(loggedInUser.id, cash);
      
      login(loggedInUser);
      setSession(session);
      toast.success(`Session started. Good luck, ${loggedInUser.firstName}!`);
      navigate('/pos');
    } catch (error) {
      console.error('Session start error:', error);
      toast.error('Failed to start session');
    } finally {
      setIsLoading(false);
    }
  };

  const NumpadButton: React.FC<{ value: string; onClick: () => void; className?: string }> = ({ 
    value, 
    onClick, 
    className = '' 
  }) => (
    <button
      onClick={onClick}
      className={`numpad-btn ${className}`}
      disabled={isLoading}
    >
      {value}
    </button>
  );

  if (showOpeningCash) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-kutunza-burgundy to-kutunza-dark flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-fadeIn">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold text-kutunza-burgundy mb-2">
              Start New Session
            </h1>
            <p className="text-gray-600">
              Welcome, {loggedInUser?.firstName}! Enter your opening cash amount.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opening Cash (₦)
            </label>
            <input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="pos-input text-2xl text-center"
              placeholder="0.00"
              autoFocus
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setShowOpeningCash(false);
                setLoggedInUser(null);
                setPin('');
              }}
              className="flex-1 pos-btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleStartSession}
              disabled={isLoading}
              className="flex-1 pos-btn-primary flex items-center justify-center gap-2"
            >
              {isLoading ? 'Starting...' : 'Start Session'}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-kutunza-burgundy to-kutunza-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-kutunza-gold rounded-full flex items-center justify-center">
            <span className="text-3xl font-display font-bold text-kutunza-dark">K</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-kutunza-burgundy">
            Kutunza POS
          </h1>
          <p className="text-gray-500 mt-1">Premium Culinary Excellence</p>
        </div>

        {/* Username Input */}
        <div className="mb-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="pos-input pl-12"
              placeholder="Username"
              autoFocus
            />
          </div>
        </div>

        {/* PIN Display */}
        <div className="mb-6">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <div className="pos-input pl-12 flex items-center justify-center gap-3 bg-gray-50">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all ${
                    i < pin.length ? 'bg-kutunza-burgundy scale-110' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <NumpadButton key={digit} value={digit} onClick={() => handlePinInput(digit)} />
          ))}
          <NumpadButton value="C" onClick={handlePinClear} className="clear" />
          <NumpadButton value="0" onClick={() => handlePinInput('0')} />
          <NumpadButton value="⌫" onClick={handlePinBackspace} className="action" />
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={isLoading || !username || !pin}
          className="w-full pos-btn-primary py-4 text-lg flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Sign In
              <ArrowRight size={20} />
            </>
          )}
        </button>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Default: admin / 1234
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
