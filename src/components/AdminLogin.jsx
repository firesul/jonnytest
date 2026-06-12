import React, { useState } from 'react';
import { Lock, X, LogIn } from 'lucide-react';

export default function AdminLogin({ isOpen, onClose, onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Por favor, ingresa la contraseña.');
      return;
    }
    
    // We delegate the authentication logic to the App component
    const success = onLogin(password);
    if (success) {
      setPassword('');
      setError('');
      onClose();
    } else {
      setError('Contraseña incorrecta. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="loginModalOverlay">
      <div 
        className="glass-card modal-content" 
        onClick={(e) => e.stopPropagation()}
        id="loginModalContent"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px' }}>
            <Lock size={20} style={{ color: 'var(--neon-mint)' }} />
            Acceso Administrador
          </h2>
          <button 
            onClick={onClose}
            className="btn-play-pause"
            style={{ width: '32px', height: '32px' }}
            id="closeLoginBtn"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="adminPassword">Contraseña</label>
            <input
              type="password"
              id="adminPassword"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '8px' }}
            id="submitLoginBtn"
          >
            <LogIn size={16} />
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
