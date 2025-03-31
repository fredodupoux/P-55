import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography
} from '@mui/material';
import React, { useState } from 'react';
import AccountService from '../services/AccountService';
import { SecurityQuestion } from '../types/SecurityQuestion';

interface DatabaseSetupScreenProps {
  onSetupComplete: (password: string) => void;
  securityQuestions: SecurityQuestion[];
}

const DatabaseSetupScreen: React.FC<DatabaseSetupScreenProps> = ({ 
  onSetupComplete,
  securityQuestions
}) => {
  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Security questions state
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([0, 0, 0]);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  
  // UI state
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password validation
  const passwordsMatch = password === confirmPassword;
  const passwordMinLength = 8;
  const isPasswordValid = password.length >= passwordMinLength;
  const isConfirmPasswordValid = confirmPassword.length > 0 && passwordsMatch;
  
  // Check for duplicate questions
  const hasDuplicateQuestions = selectedQuestions.some(
    (question, index) => 
      question !== 0 && selectedQuestions.indexOf(question) !== index
  );

  // Check if answers are provided
  const areAnswersProvided = answers.every((answer, index) => 
    selectedQuestions[index] === 0 || answer.trim().length > 0
  );

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  };

  const handleQuestionChange = (index: number, questionId: number) => {
    const newQuestions = [...selectedQuestions];
    newQuestions[index] = questionId;
    setSelectedQuestions(newQuestions);
  };

  const handleAnswerChange = (index: number, answer: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = answer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate password before moving to security questions
      if (!isPasswordValid) {
        setError(`Password must be at least ${passwordMinLength} characters long`);
        return;
      }
      if (!isConfirmPasswordValid) {
        setError("Passwords don't match");
        return;
      }
      setError(null);
    }
    setActiveStep(prevStep => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Final validation
    if (!isPasswordValid || !isConfirmPasswordValid) {
      setError("Please check your password entries");
      return;
    }
    
    if (hasDuplicateQuestions) {
      setError("Please select different security questions");
      return;
    }
    
    // Ensure we have at least one security question selected
    const validQuestions = selectedQuestions.filter(q => q !== 0);
    if (validQuestions.length === 0) {
      setError("Please select at least one security question");
      return;
    }
    
    if (!areAnswersProvided) {
      setError("Please provide answers for all selected questions");
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare security questions and answers
      const securityData = selectedQuestions
        .map((questionId, index) => ({
          questionId,
          answer: answers[index].trim().toLowerCase() // Store lowercase for case-insensitive comparison
        }))
        .filter(item => item.questionId !== 0); // Filter out unselected questions
      
      console.log("Security data being sent:", securityData);
      
      // Create database with password and security questions
      const result = await AccountService.setupDatabase(password, securityData);
      
      if (result) {
        onSetupComplete(password);
      } else {
        throw new Error("Failed to set up database");
      }
    } catch (error) {
      console.error("Database setup error:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh'
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          maxWidth: 600, 
          width: '100%',
          borderRadius: 2
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{ mb: 3 }}
        >
          Set Up P+55
        </Typography>
        
        <Typography variant="body1" paragraph align="center">
          Welcome to P+55! Please create a master password and set up security questions
          to protect your password database.
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          <Step>
            <StepLabel>Create Password</StepLabel>
          </Step>
          <Step>
            <StepLabel>Security Questions</StepLabel>
          </Step>
        </Stepper>
        
        <form onSubmit={handleSubmit}>
          {activeStep === 0 ? (
            // Step 1: Password Creation
            <Box>
              <Typography variant="h6" gutterBottom>
                Create your master password
              </Typography>
              
              <Typography variant="body2" paragraph color="text.secondary">
                This password will be used to encrypt all your data. Make sure it's secure
                and something you'll remember. We recommend at least 8 characters.
              </Typography>
              
              <TextField
                fullWidth
                variant="outlined"
                margin="normal"
                label="Master Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                error={password.length > 0 && !isPasswordValid}
                helperText={password.length > 0 && !isPasswordValid 
                  ? `Password must be at least ${passwordMinLength} characters long` 
                  : ""}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        aria-label={showPassword ? 'hide password' : 'show password'}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              
              <TextField
                fullWidth
                variant="outlined"
                margin="normal"
                label="Confirm Master Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                error={confirmPassword.length > 0 && !passwordsMatch}
                helperText={confirmPassword.length > 0 && !passwordsMatch 
                  ? "Passwords don't match" 
                  : ""}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        aria-label={showConfirmPassword ? 'hide password' : 'show password'}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          ) : (
            // Step 2: Security Questions
            <Box>
              <Typography variant="h6" gutterBottom>
                Set up security questions
              </Typography>
              
              <Typography variant="body2" paragraph color="text.secondary">
                These questions will help you recover your password if you forget it.
                Choose questions you can easily remember the answers to.
              </Typography>
              
              {[0, 1, 2].map((index) => (
                <Box key={index} sx={{ mb: 3 }}>
                  <FormControl 
                    fullWidth 
                    margin="normal"
                    error={hasDuplicateQuestions && selectedQuestions[index] !== 0 && 
                      selectedQuestions.indexOf(selectedQuestions[index]) !== index}
                  >
                    <FormLabel id={`security-question-${index}-label`}>
                      Security Question {index + 1}
                    </FormLabel>
                    <Select
                      labelId={`security-question-${index}-label`}
                      value={selectedQuestions[index]}
                      onChange={(e) => handleQuestionChange(index, Number(e.target.value))}
                      displayEmpty
                    >
                      <MenuItem value={0}>Select a security question</MenuItem>
                      {securityQuestions.map(question => (
                        <MenuItem key={question.id} value={question.id}>
                          {question.question}
                        </MenuItem>
                      ))}
                    </Select>
                    {hasDuplicateQuestions && selectedQuestions[index] !== 0 && 
                      selectedQuestions.indexOf(selectedQuestions[index]) !== index && (
                      <FormHelperText>Please select a different question</FormHelperText>
                    )}
                  </FormControl>
                  
                  {selectedQuestions[index] !== 0 && (
                    <TextField
                      fullWidth
                      variant="outlined"
                      margin="normal"
                      label="Your Answer"
                      value={answers[index]}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      disabled={selectedQuestions[index] === 0}
                      error={selectedQuestions[index] !== 0 && answers[index].trim() === ''}
                      helperText={selectedQuestions[index] !== 0 && answers[index].trim() === '' 
                        ? "Answer is required" 
                        : ""}
                    />
                  )}
                </Box>
              ))}
            </Box>
          )}
          
          {error && (
            <Typography color="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            {activeStep > 0 ? (
              <Button 
                onClick={handleBack} 
                disabled={loading}
              >
                Back
              </Button>
            ) : (
              <Box /> // Empty space for alignment
            )}
            
            {activeStep < 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!isPasswordValid || !isConfirmPasswordValid}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                variant="contained"
                disabled={loading || hasDuplicateQuestions || !areAnswersProvided}
              >
                {loading ? <CircularProgress size={24} /> : 'Complete Setup'}
              </Button>
            )}
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default DatabaseSetupScreen;
