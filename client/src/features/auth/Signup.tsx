import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import api from '../../lib/axios';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.post('/auth/signup', {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setSuccessMsg(response.data.message || 'Registration successful! Redirecting...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
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
          <img src="/logo.png" className="h-20 w-auto max-w-full object-contain mb-4" alt="AssetFlow Logo" />

          <h2 className="text-center text-3xl font-bold font-heading bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            AssetFlow Organization Member Signup
          </p>
        </div>

        {/* Security Callout Banner */}
        <div className="p-3 bg-accent/10 border border-accent/20 text-accent rounded-lg text-xs font-semibold text-center">
          ℹ️ Sign up creates an Employee account — admin and manager roles are assigned by an administrator later.
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-sm text-center">
            {successMsg}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Full Name
            </label>
            <input
              type="text"
              disabled={loading}
              {...register('name')}
              className={`w-full px-4 py-3 rounded-lg border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                errors.name ? 'border-red-500' : 'border-border'
              }`}
              placeholder="Priya Shah"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

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
              placeholder="priya@company.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Password
            </label>
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              disabled={loading}
              {...register('confirmPassword')}
              className={`w-full px-4 py-3 rounded-lg border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                errors.confirmPassword ? 'border-red-500' : 'border-border'
              }`}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
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
                'Sign Up'
              )}
            </motion.button>
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Signup;
