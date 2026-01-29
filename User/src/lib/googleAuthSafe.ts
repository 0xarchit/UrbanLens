import { Alert } from "react-native";

// Mock objects for when the module is missing
const mockGoogleSignin = {
  configure: (config?: any) => {
    console.warn("Google Sign-In: Mock configure called (Module not found)");
  },
  hasPlayServices: async () => {
    console.warn("Google Sign-In: Mock hasPlayServices called");
    return Promise.resolve(true);
  },
  signIn: async () => {
    Alert.alert(
      "Not Supported in Expo Go", 
      "Native Google Sign-In requires a Development Build. Please use 'Dev Mode' or build a custom client."
    );
    throw new Error("RNGoogleSignin not found");
  },
  signOut: async () => {
    console.warn("Google Sign-In: Mock signOut called");
    return Promise.resolve();
  },
  getTokens: async () => {
     return Promise.reject(new Error("RNGoogleSignin not found"));
  }
};

const mockStatusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
};

// Safe implementation
let GoogleSignin: any = mockGoogleSignin;
let statusCodes = mockStatusCodes;
let isErrorWithCode = (error: any): boolean => false;

try {
  // Try to require the native module
  const nativeModule = require("@react-native-google-signin/google-signin");
  
  // If successful, export the real implementations
  GoogleSignin = nativeModule.GoogleSignin;
  statusCodes = nativeModule.statusCodes;
  isErrorWithCode = nativeModule.isErrorWithCode;
} catch (error) {
  console.log("SafeGoogleAuth: Native Google Sign-In module not found (running in Expo Go?)");
}

export { GoogleSignin, statusCodes, isErrorWithCode };
