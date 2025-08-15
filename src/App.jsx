import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import AuthForm from './components/AuthForm';
import ModerationQueue from './components/ModerationQueue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Shield, Users, AlertTriangle } from 'lucide-react';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user has moderator role
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          const role = userData?.role;
          
          if (role === 'moderator' || role === 'admin') {
            setUser(user);
            setUserRole(role);
          } else {
            // User doesn't have moderator role, sign them out
            await signOut(auth);
            setUser(null);
            setUserRole(null);
          }
        } catch (error) {
          console.error('Error checking user role:', error);
          await signOut(auth);
          setUser(null);
          setUserRole(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Défi du Jour</h1>
                <p className="text-sm text-gray-500">Interface de modération</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{user.email}</span>
                <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
                  {userRole === 'admin' ? 'Admin' : 'Modérateur'}
                </Badge>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Instructions de modération</h3>
              <p className="text-sm text-blue-700 mt-1">
                Examinez chaque soumission pour vous assurer qu'elle respecte les règles du défi et 
                les conditions d'utilisation. Les soumissions avec un score IA faible nécessitent une attention particulière.
              </p>
            </div>
          </div>
        </div>

        <ModerationQueue />
      </main>
    </div>
  );
}

export default App;
