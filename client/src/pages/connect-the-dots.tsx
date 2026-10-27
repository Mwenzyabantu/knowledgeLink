import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import type {
  ConnectCourseWithTopics,
  ConnectMapDetail,
  ConnectMapSummary,
} from "@shared/schema";
import { Landing } from "@/components/connect-the-dots/landing";
import { MapView } from "@/components/connect-the-dots/map-view";
import { COURSES_KEY, MAPS_KEY, mapKey, readJson } from "@/components/connect-the-dots/api";
import type { CourseInput, CreateMapInput } from "@/components/connect-the-dots/types";

export default function ConnectTheDots() {
  const params = useParams<{ mapId?: string }>();
  const mapId = params.mapId;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [initialAssessmentError, setInitialAssessmentError] = useState<{
    mapId: string;
    message: string;
  } | null>(null);

  const {
    data: courses = [],
    isLoading: coursesLoading,
    isError: coursesError,
    error: courseError,
    refetch: refetchCourses,
  } = useQuery<ConnectCourseWithTopics[]>({
    queryKey: COURSES_KEY,
    enabled: !mapId,
  });
  const {
    data: maps = [],
    isLoading: mapsLoading,
    isError: mapsError,
    error: mapsErrorValue,
    refetch: refetchMaps,
  } = useQuery<ConnectMapSummary[]>({
    queryKey: MAPS_KEY,
    enabled: !mapId,
  });
  const {
    data: map,
    isLoading: mapLoading,
    isError: mapError,
    error: mapErrorValue,
    refetch: refetchMap,
  } = useQuery<ConnectMapDetail>({
    queryKey: mapId ? mapKey(mapId) : ["/api/connect-the-dots/maps/disabled"],
    enabled: !!mapId,
  });

  const deleteMap = useMutation({
    mutationFn: (id: string) => readJson<{ ok: true }>("DELETE", `/api/connect-the-dots/maps/${id}`),
    onSuccess: async (_result, id) => {
      await queryClient.invalidateQueries({ queryKey: MAPS_KEY });
      queryClient.removeQueries({ queryKey: mapKey(id) });
      if (mapId === id) setLocation("/connect-the-dots");
    },
  });

  const createCourse = useMutation({
    mutationFn: (input: CourseInput) => readJson<ConnectCourseWithTopics>("POST", "/api/connect-the-dots/courses", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSES_KEY }),
  });
  const updateCourse = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CourseInput }) =>
      readJson<ConnectCourseWithTopics>("PUT", `/api/connect-the-dots/courses/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSES_KEY }),
  });
  const createMap = useMutation({
    mutationFn: (input: CreateMapInput) => readJson<ConnectMapDetail>("POST", "/api/connect-the-dots/maps", input),
    onMutate: () => setInitialAssessmentError(null),
    onSuccess: async (created, input) => {
      let mapToOpen = created;
      let assessmentError: string | null = null;

      if (input.entryPath === "known_use" && input.knownUse?.trim()) {
        try {
          mapToOpen = await readJson<ConnectMapDetail>(
            "POST",
            `/api/connect-the-dots/maps/${created.id}/use-assessment`,
            { description: input.knownUse.trim() },
          );
        } catch (error) {
          assessmentError = error instanceof Error ? error.message : String(error);
        }
      }

      queryClient.setQueryData(mapKey(created.id), mapToOpen);
      if (assessmentError) {
        setInitialAssessmentError({ mapId: created.id, message: assessmentError });
      }
      void queryClient.invalidateQueries({ queryKey: MAPS_KEY });
      setLocation(`/connect-the-dots/${created.id}`);
    },
  });

  if (!mapId) {
    return (
      <Landing
        courses={courses}
        coursesLoading={coursesLoading}
        coursesError={coursesError ? String(courseError) : null}
        retryCourses={() => { void refetchCourses(); }}
        maps={maps}
        mapsLoading={mapsLoading}
        mapsError={mapsError ? String(mapsErrorValue) : null}
        retryMaps={() => { void refetchMaps(); }}
        createCourse={createCourse}
        updateCourse={updateCourse}
        createMap={createMap}
        deleteMap={deleteMap}
      />
    );
  }

  return (
    <MapView
      mapId={mapId}
      map={map}
      isLoading={mapLoading}
      isError={mapError}
      error={mapErrorValue ? String(mapErrorValue) : "Could not load this saved map."}
      retry={() => { void refetchMap(); }}
      initialAssessmentError={initialAssessmentError?.mapId === mapId ? initialAssessmentError.message : null}
      deleteMap={deleteMap}
      queryClient={queryClient}
    />
  );
}
