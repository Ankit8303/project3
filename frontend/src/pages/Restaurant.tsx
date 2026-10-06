import { useEffect, useState } from "react";
import type { IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../main";
import AddRestaurant from "../components/AddRestaurant";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import AddMenuItem from "../components/AddMenuItem";
import RestaurantOrders from "../components/RestaurantOrders";

import DashboardHeader from "../components/DashboardHeader";
import { getAuthToken, setAuthToken } from "../auth/tokenStore";

type SellerTab = "menu" | "add-item" | "sales";

const Restaurant = () => {
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SellerTab>("menu");

  const fetchMyRestaurant = async () => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/restaurant/my`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      setRestaurant(data.restaurant || null);

      if (data.token) {
        setAuthToken(data.token);
        window.location.reload();
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRestaurant();
  }, []);

  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);

  const fetchMenuItems = async (restaurantId: string) => {
    try {
      const { data } = await axios.get(
        `${restaurantService}/api/item/all/${restaurantId}`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      setMenuItems(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (restaurant?._id) {
      fetchMenuItems(restaurant._id);
    }
  }, [restaurant]);

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DashboardHeader title="Restaurant Partner Dashboard" roleBadge="Seller" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-500">Loading your restaurant...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader title="Restaurant Partner Dashboard" roleBadge="Seller" badgeColor="bg-amber-100 text-amber-800 border-amber-200" />
      <div className="px-4 py-6 space-y-6 max-w-7xl mx-auto w-full">
        {!restaurant ? (
          <AddRestaurant fetchMyRestaurant={fetchMyRestaurant} />
        ) : (
          <>
            <RestaurantProfile
              restaurant={restaurant}
              onUpdate={setRestaurant}
              isSeller={true}
            />

      <RestaurantOrders restaurantId={restaurant._id} />

      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex border-b">
          {[
            { key: "menu", label: "Menu Items" },
            { key: "add-item", label: "Add Item" },
            { key: "sales", label: "Sales" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as SellerTab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                tab === t.key
                  ? "border-b-2 border-red-500 text-red-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "menu" && (
            <MenuItems
              items={menuItems}
              onItemDeleted={() => fetchMenuItems(restaurant._id)}
              isSeller={true}
            />
          )}
          {tab === "add-item" && (
            <AddMenuItem onItemAdded={() => fetchMenuItems(restaurant._id)} />
          )}
          {tab === "sales" && <p>Sales Page</p>}
        </div>
      </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Restaurant;
