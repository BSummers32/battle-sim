import React from 'react';
import ReactDOM from 'react-dom/client';
import BattleSimulator from './App'; // Looks for App.jsx in the same folder

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BattleSimulator />
  </React.StrictMode>
);