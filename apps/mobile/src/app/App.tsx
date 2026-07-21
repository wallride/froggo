import { AppProviders } from "./providers/AppProviders";
import { HomeScreen } from "../screens/HomeScreen";

export default function App() {
  return (
    <AppProviders>
      <HomeScreen/>
    </AppProviders>
  );
}
