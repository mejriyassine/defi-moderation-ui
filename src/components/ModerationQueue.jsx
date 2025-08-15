import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

const ModerationQueue = () => {
  const [queueItems, setQueueItems] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [challenges, setChallenges] = useState({});
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const moderateSubmission = httpsCallable(functions, 'moderateSubmission');

  useEffect(() => {
    // Listen to moderation queue
    const queueQuery = query(
      collection(db, 'moderationQueue'),
      orderBy('queuedAt', 'asc')
    );

    const unsubscribe = onSnapshot(queueQuery, async (snapshot) => {
      const items = [];
      const submissionIds = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({ id: doc.id, ...data });
        submissionIds.push(data.submissionId);
      });

      setQueueItems(items);

      // Fetch submission details
      const submissionPromises = submissionIds.map(async (submissionId) => {
        const submissionDoc = await getDoc(doc(db, 'submissions', submissionId));
        if (submissionDoc.exists()) {
          const submissionData = submissionDoc.data();
          
          // Fetch challenge details
          const challengeDoc = await getDoc(doc(db, 'challenges', submissionData.challengeId));
          const challengeData = challengeDoc.exists() ? challengeDoc.data() : null;
          
          // Fetch user details
          const userDoc = await getDoc(doc(db, 'users', submissionData.userId));
          const userData = userDoc.exists() ? userDoc.data() : null;

          return {
            submissionId,
            submission: submissionData,
            challenge: challengeData,
            user: userData
          };
        }
        return null;
      });

      const results = await Promise.all(submissionPromises);
      const newSubmissions = {};
      const newChallenges = {};
      const newUsers = {};

      results.forEach((result) => {
        if (result) {
          newSubmissions[result.submissionId] = result.submission;
          if (result.challenge) {
            newChallenges[result.submission.challengeId] = result.challenge;
          }
          if (result.user) {
            newUsers[result.submission.userId] = result.user;
          }
        }
      });

      setSubmissions(newSubmissions);
      setChallenges(newChallenges);
      setUsers(newUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (submissionId) => {
    setProcessingId(submissionId);
    try {
      await moderateSubmission({
        submissionId,
        action: 'approve'
      });
    } catch (error) {
      console.error('Error approving submission:', error);
      alert('Erreur lors de l\'approbation: ' + error.message);
    }
    setProcessingId(null);
  };

  const handleReject = async (submissionId) => {
    if (!rejectionReason.trim()) {
      alert('Veuillez fournir une raison pour le rejet.');
      return;
    }

    setProcessingId(submissionId);
    try {
      await moderateSubmission({
        submissionId,
        action: 'reject',
        reason: rejectionReason
      });
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting submission:', error);
      alert('Erreur lors du rejet: ' + error.message);
    }
    setProcessingId(null);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date inconnue';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAIScoreColor = (score) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Chargement de la file de modération...</p>
        </div>
      </div>
    );
  }

  if (queueItems.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">File de modération vide</h3>
        <p className="text-gray-600">Toutes les soumissions ont été traitées!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">File de modération</h2>
        <Badge variant="secondary">
          {queueItems.length} soumission{queueItems.length > 1 ? 's' : ''} en attente
        </Badge>
      </div>

      {queueItems.map((item) => {
        const submission = submissions[item.submissionId];
        const challenge = challenges[submission?.challengeId];
        const user = users[submission?.userId];

        if (!submission) return null;

        return (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {challenge?.title || 'Défi inconnu'}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {submission.aiScore !== undefined && (
                    <Badge className={getAIScoreColor(submission.aiScore)}>
                      IA: {(submission.aiScore * 100).toFixed(0)}%
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {submission.type === 'photo' ? 'Photo' : 'Vidéo'}
                  </Badge>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>Utilisateur: {user?.displayName || 'Utilisateur inconnu'}</p>
                <p>Soumis le: {formatDate(submission.createdAt)}</p>
                <p>En file depuis: {formatDate(item.queuedAt)}</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Media Preview */}
              <div className="flex justify-center">
                {submission.type === 'photo' ? (
                  <img
                    src={submission.mediaUrl}
                    alt="Soumission"
                    className="max-w-md max-h-64 object-contain rounded-lg border"
                  />
                ) : (
                  <video
                    src={submission.mediaUrl}
                    controls
                    className="max-w-md max-h-64 rounded-lg border"
                  />
                )}
              </div>

              {/* Caption */}
              {submission.caption && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">Légende:</p>
                  <p className="text-sm">{submission.caption}</p>
                </div>
              )}

              {/* Challenge Details */}
              {challenge && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">Description du défi:</p>
                  <p className="text-sm">{challenge.description}</p>
                  {challenge.rules && (
                    <>
                      <p className="text-sm font-medium mt-2 mb-1">Règles:</p>
                      <p className="text-sm">{challenge.rules}</p>
                    </>
                  )}
                </div>
              )}

              {/* AI Analysis Warning */}
              {submission.aiScore !== undefined && submission.aiScore < 0.6 && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Attention</p>
                    <p className="text-sm text-yellow-700">
                      Cette soumission a un score IA faible ({(submission.aiScore * 100).toFixed(0)}%). 
                      Vérifiez attentivement le contenu.
                    </p>
                  </div>
                </div>
              )}

              {/* Rejection Reason Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Raison du rejet (optionnel):</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Expliquez pourquoi cette soumission est rejetée..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => handleApprove(item.submissionId)}
                  disabled={processingId === item.submissionId}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approuver
                </Button>
                <Button
                  onClick={() => handleReject(item.submissionId)}
                  disabled={processingId === item.submissionId}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ModerationQueue;

