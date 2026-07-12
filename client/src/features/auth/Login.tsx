import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/authContext';
import api from '../../lib/axios';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.post('/auth/login', data);
      const { accessToken, refreshToken, user } = response.data;
      login(accessToken, refreshToken, user);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      const response = await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotMsg(response.data.message);
    } catch (err) {
      setForgotMsg('An error occurred. Check server logs.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8 glass p-8 rounded-2xl shadow-xl shadow-primary/5"
      >
        <div className="flex flex-col items-center">
          {/* Custom App Logo */}
          <img src="/logo.png" className="w-24 h-24 object-contain" alt="AssetFlow Logo" />

          <p className="text-center text-sm text-muted-foreground">
            Enterprise Asset & Resource Management
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm text-center">
            {errorMsg}
          </div>
        )}

        {!showForgot ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 rounded-md">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled={loading}
                  {...register('email')}
                  className={`w-full px-4 py-3 rounded-lg border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                    errors.email ? 'border-red-500' : 'border-border'
                  }`}
                  placeholder="name@company.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  disabled={loading}
                  {...register('password')}
                  className={`w-full px-4 py-3 rounded-lg border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                    errors.password ? 'border-red-500' : 'border-border'
                  }`}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                ) : (
                  'Sign In'
                )}
              </motion.button>
            </div>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/signup" className="text-primary hover:underline font-semibold">
                Sign Up
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleForgotSubmit}>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Enter your email address and we'll log a password reset link to the system.
              </p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-surface focus:outline-none focus:ring-2"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {forgotMsg && (
              <p className="text-xs text-primary font-medium text-center bg-primary/10 p-2.5 rounded-lg">
                {forgotMsg}
              </p>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setForgotMsg(null);
                }}
                className="w-1/2 py-3 px-4 border border-border rounded-lg text-sm font-semibold hover:bg-surface-hover transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                className="w-1/2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/95 transition-all"
              >
                Reset Password
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
