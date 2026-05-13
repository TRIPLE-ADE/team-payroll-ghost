import { http } from "@/lib/http";
import type { EmployeeDirectoryEntry } from "@/types/domain";

export async function fetchEmployeesDirectory(): Promise<EmployeeDirectoryEntry[]> {
  const { data } = await http.get<EmployeeDirectoryEntry[]>(
    "/api/v1/employees/directory",
  );
  return data;
}
