import { StatusBar } from "react-native";
import { HomeScreen } from "./src/screens/HomeScreen";

function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#12121f" />
      <HomeScreen />
    </>
  );
}

export default App;
