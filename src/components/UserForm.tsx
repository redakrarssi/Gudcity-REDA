import React, { useState } from 'react';
import { createUser, UserRole, UserType } from '../services/userService';

interface UserFormProps {
  onUserAdded?: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ onUserAdded }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState<UserType>('customer');
  const [role, setRole] = useState<UserRole>('customer');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('Creating new user with data:', {
        name,
        email,
        userType,
        role,
        businessName: userType === 'business' ? businessName : undefined,
        businessPhone: userType === 'business' ? businessPhone : undefined
      });
      
      // Prepare user object based on type
      const userData = {
        name,
        email,
        password,
        role,
        userType,
        businessName: userType === 'business' ? businessName : undefined,
        businessPhone: userType === 'business' ? businessPhone : undefined
      };
      
      const newUser = await createUser(userData);
      
      if (newUser) {
        console.log('User created successfully:', newUser);
        setSuccess(true);
        // Reset form
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setUserType('customer');
        setRole('customer');
        setBusinessName('');
        setBusinessPhone('');
        
        if (onUserAdded) {
          onUserAdded();
        }
      } else {
        console.error('Failed to create user');
        setError('Failed to create user. Email might already be in use.');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      if (err instanceof Error) {
        setError(`Error: ${err.message}`);
      } else {
        setError('An error occurred while creating the user.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
          User successfully added!
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User Type
          </label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-blue-600"
                name="userType"
                value="customer"
                checked={userType === 'customer'}
                onChange={() => {
                  setUserType('customer');
                  if (role === 'business') setRole('customer');
                }}
              />
              <span className="ml-2">Customer</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-blue-600"
                name="userType"
                value="business"
                checked={userType === 'business'}
                onChange={() => {
                  setUserType('business');
                  setRole('business');
                }}
              />
              <span className="ml-2">Business</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-blue-600"
                name="userType"
                value="staff"
                checked={userType === 'customer' && role === 'admin'}
                onChange={() => {
                  setUserType('customer');
                  setRole('admin');
                }}
              />
              <span className="ml-2">Staff</span>
            </label>
          </div>
        </div>
        
        {/* Show business fields only when business type is selected */}
        {userType === 'business' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={userType === 'business'}
              />
            </div>
            
            <div>
              <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Business Phone
              </label>
              <input
                type="tel"
                id="businessPhone"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={userType === 'business'}
              />
            </div>
          </div>
        )}
        
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 px-4 rounded-md font-medium text-white ${
            isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Adding...' : 'Add User'}
        </button>
      </form>
    </div>
  );
}; 