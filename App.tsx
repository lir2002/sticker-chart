import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import CalendarView from "./components/CalendarView";


export default function App() {
  return (
    <>
      <CalendarView />
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
