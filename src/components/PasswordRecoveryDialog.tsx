import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import AccountService from '../services/AccountService';
import { SecurityQuestion, SecurityQuestionAnswer } from '../types/SecurityQuestion';

interface PasswordRecoveryDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newPassword: string) => void;
  securityQuestions: SecurityQuestion[];
}

const PasswordRecoveryDialog: React.FC<PasswordRecoveryDialogProps> = ({
  open,
  onClose,
  onSuccess,
  securityQuestions
}) => {
  // Recovery steps
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Security questions
  const [questionIds, setQuestionIds] = useState<number[]>([]);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  
  // New password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Load security questions when dialog opens
  useEffect(() => {
    if (open) {
      loadSecurityQuestions();
    } else {
      // Reset state when dialog is closed
      setActiveStep(0);
      setError(null);
      setAnswers(['', '', '']);
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [open]);

  const loadSecurityQuestions = async () => {
    setIsLoading(true);
    try {
      const questions = await AccountService.getSecurityQuestions();
      if (questions && questions.length > 0) {
        setQuestionIds(questions);
      } else {
        setError('No security questions found. Password recovery is not possible.');
      }
    } catch (error) {
      console.error('Failed to load security questions:', error);
      setError('Failed to load security questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      // Verify security answers
      setIsLoading(true);
      setError(null);
      
      try {
        const questionAnswers: SecurityQuestionAnswer[] = questionIds.map((questionId, index) => ({
          questionId,
          answer: answers[index].trim().toLowerCase()
        }));
        
        const verified = await AccountService.verifySecurityAnswers(questionAnswers);
        
        if (verified) {
          setActiveStep(1);
        } else {
          setError('The answers provided do not match our records. Please try again.');
        }
      } catch (error) {
        console.error('Error verifying security answers:', error);
        setError('An error occurred while verifying your answers');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    setActiveStep(0);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const questionAnswers: SecurityQuestionAnswer[] = questionIds.map((questionId, index) => ({
        questionId,
        answer: answers[index].trim().toLowerCase()
      }));
      
      const success = await AccountService.resetPasswordWithSecurityAnswers(
        newPassword,
        questionAnswers
      );
      
      if (success) {
        onSuccess(newPassword);
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('An error occurred while resetting your password');
    } finally {
      setIsLoading(false);
    }
  };

  // Whether all answers are provided
  const areAnswersComplete = answers.every((answer) => answer.trim() !== '');
  
  // Whether passwords are valid
  const isPasswordValid = newPassword.length >= 8;
  const doPasswordsMatch = newPassword === confirmPassword;

  return (
    <Dialog 
      open={open} 
      onClose={isLoading ? undefined : onClose}
      maxWidth="sm" 
      fullWidth
    >
      <DialogTitle>Recover Master Password</DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 1 }}>
          <Step>
            <StepLabel>Security Questions</StepLabel>
          </Step>
          <Step>
            <StepLabel>New Password</StepLabel>
          </Step>
        </Stepper>
        
        {isLoading && questionIds.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : error && questionIds.length === 0 ? (
          <Typography color="error" sx={{ my: 2 }}>
            {error}
          </Typography>
        ) : (
          <form onSubmit={handleSubmit}>
            {activeStep === 0 ? (
              // Step 1: Answer security questions
              <Box>
                <Typography variant="body2" paragraph>
                  Please answer your security questions to recover your password.
                </Typography>
                
                {questionIds.map((questionId, index) => {
                  const question = securityQuestions.find(q => q.id === questionId);
                  return (
                    <TextField
                      key={index}
                      label={question ? question.question : `Question ${index + 1}`}
                      fullWidth
                      margin="normal"
                      value={answers[index]}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      required
                    />
                  );
                })}
              </Box>
            ) : (
              // Step 2: Set new password
              <Box>
                <Typography variant="body2" paragraph>
                  Please enter your new master password.
                </Typography>
                
                <TextField
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  margin="normal"
                  required
                  error={newPassword.length > 0 && !isPasswordValid}
                  helperText={newPassword.length > 0 && !isPasswordValid 
                    ? "Password must be at least 8 characters long" 
                    : ""}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                
                <TextField
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  margin="normal"
                  required
                  error={confirmPassword.length > 0 && !doPasswordsMatch}
                  helperText={confirmPassword.length > 0 && !doPasswordsMatch 
                    ? "Passwords do not match" 
                    : ""}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
            )}
            
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </form>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        
        {activeStep === 1 && (
          <Button onClick={handleBack} disabled={isLoading}>
            Back
          </Button>
        )}
        
        {activeStep === 0 ? (
          <Button 
            onClick={handleNext} 
            disabled={isLoading || !areAnswersComplete}
            variant="contained"
          >
            {isLoading ? <CircularProgress size={24} /> : 'Next'}
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
            variant="contained"
            color="primary"
          >
            {isLoading ? <CircularProgress size={24} /> : 'Reset Password'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PasswordRecoveryDialog;
