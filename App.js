import { Picker } from "@react-native-picker/picker";
import { Asset } from "expo-asset";
import { requestForegroundPermissionsAsync } from "expo-location";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

export default function App() {
  // assets
  const busURI = Asset.fromModule(require("./assets/bus.png")).uri;

  // state
  const [route, setRoute] = useState(10);
  const [routeList, setRouteList] = useState([]);
  const [stops, setStops] = useState([]);
  const [buses, setBuses] = useState([]);
  const [trace, setTrace] = useState();

  // fetch route list
  useEffect(() => {
    // get location perms
    requestForegroundPermissionsAsync();

    (async () => {
      const req = await fetch(
        "http://webwatch.lavta.org/TMWebWatch/Arrivals.aspx/getRoutes",
        {
          headers: {
            Accept: "application/json, text/javascript, */*; q=0.01",
            "Content-Type": "application/json;\tcharset=utf-8",
          },
          method: "POST",
        }
      );
      const fetchedRoutes = await req.json();
      setRouteList(fetchedRoutes.d);
    })();
  }, []);

  useEffect(() => {
    // fetch bus info defn
    const fetchBus = async () => {
      const fetchedBus = await (
        await fetch(
          "http://webwatch.lavta.org/TMWebWatch/GoogleMap.aspx/getVehicles",
          {
            headers: {
              Accept: "application/json, text/javascript, */*; q=0.01",
              "Content-Type": "application/json;\tcharset=utf-8",
            },
            body: `{routeID: ${route}}`,
            method: "POST",
          }
        )
      ).json();

      // alert once
      if (!fetchedBus.d?.length) {
        Alert.alert(
          "No buses currently running for selected route",
          "Try again later"
        );
        clearInterval(i);
      }
      setBuses(fetchedBus.d);
    };

    // fetch stops and trace
    (async () => {
      const fetchedStops = await (
        await fetch(
          "http://webwatch.lavta.org/TMWebWatch/GoogleMap.aspx/getStops",
          {
            headers: {
              Accept: "application/json, text/javascript, */*; q=0.01",
              "Content-Type": "application/json;\tcharset=utf-8",
            },
            body: `{routeID: ${route}}`,
            method: "POST",
          }
        )
      ).json();
      const fetchedTrace = await (
        await fetch(
          "http://webwatch.lavta.org/TMWebWatch/GoogleMap.aspx/getRouteTrace",
          {
            headers: {
              Accept: "application/json, text/javascript, */*; q=0.01",
              "Content-Type": "application/json;\tcharset=utf-8",
            },
            body: `{routeID: ${route}}`,
            method: "POST",
          }
        )
      ).json();

      // parse polylines response to LatLng
      const polylines = fetchedTrace.d.polylines.map((p) =>
        p.map((l) => ({
          latitude: l.lat,
          longitude: l.lon,
        }))
      );

      setStops(fetchedStops.d);
      setTrace({ penColor: fetchedTrace.d.penColor, polylines });
    })();

    // set bus update interval
    const i = setInterval(fetchBus, 7 * 1000);
    fetchBus();
    return () => clearInterval(i);
  }, [route]);

  return (
    <View style={styles.container}>
      <View style={styles.picker}>
        <Text style={{ flexBasis: "auto", fontSize: 18 }}>Route: </Text>
        <Picker
          selectedValue={route}
          onValueChange={(id) => setRoute(id)}
          style={{ flexGrow: 1, fontSize: 18 }}
        >
          {routeList.map((r, i) => (
            <Picker.Item label={r.name} value={r.id} key={i} />
          ))}
        </Picker>
      </View>
      <MapView
        initialRegion={{
          latitude: 37.702222,
          longitude: -121.935833,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        followsUserLocation={true}
        showsBuildings={false}
        style={styles.map}
      >
        {stops.map((stop, i) => (
          <Marker
            key={i}
            coordinate={{ latitude: stop.lat, longitude: stop.lon }}
            title={stop.stopName}
            description={stop.timePointID ? undefined : "(minor stop)"}
            pinColor={stop.timePointID ? "red" : "teal"}
            opacity={stop.timePointID ? 1 : 0.85}
          />
        ))}
        {buses &&
          buses.map((bus, i) => (
            <Marker
              key={i}
              coordinate={{ latitude: bus.lat, longitude: bus.lon }}
              rotation={bus.heading}
              style={{ zIndex: 100 }}
            >
              <Image
                source={{ uri: busURI }}
                style={{
                  width: 32,
                  height: 32,
                  // flip image for opposite direction
                  transform: [{ scaleX: bus.heading > 180 ? -1 : 1 }],
                }}
                resizeMode="contain"
                resizeMethod="resize"
              />
            </Marker>
          ))}
        {trace &&
          trace.polylines.map((p, i) => (
            <Polyline strokeColor={trace.penColor} coordinates={p} key={i} />
          ))}
      </MapView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  picker: {
    padding: 10,
    paddingBottom: 0,
    flexBasis: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.75,
  },
  map: {
    flex: 3,
    width: "100%",
  },
});
