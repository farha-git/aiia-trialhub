import { supabase } from "./supabase";

export async function getStudies() {
  const { data, error } = await supabase
    .from("studies")
    .select("*");

  if (error) {
    throw error;
  }

  return data;
}