import { useCallback, useEffect, useRef, useState } from 'react';

export function useQuery(fetcher, key = '', enabled = true) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!enabled) { setState({ data: null, loading: false, error: null }); return; }
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    Promise.resolve().then(() => fetcherRef.current(controller.signal))
      .then(data => { if (!controller.signal.aborted) setState({ data, loading: false, error: null }); })
      .catch(error => { if (!controller.signal.aborted) setState({ data: null, loading: false, error }); });
    return () => controller.abort();
  }, [key, revision, enabled]);
  return { ...state, reload };
}

export function useMutation() {
  const active = useRef(false);
  const [state, setState] = useState({ loading: false, error: null, success: '' });
  const clear = () => setState({ loading: false, error: null, success: '' });
  const run = async (operation, message = '') => {
    if (active.current) return;
    active.current = true;
    setState({ loading: true, error: null, success: '' });
    try {
      const result = await operation();
      setState({ loading: false, error: null, success: message || result?.message || result?.mensaje || '' });
      return result;
    } catch (error) { setState({ loading: false, error, success: '' }); }
    finally { active.current = false; }
  };
  return { ...state, run, clear };
}
