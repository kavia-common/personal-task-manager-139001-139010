import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import supabase, { getSupabaseClient } from './lib/supabaseClient';

/**
 * PUBLIC_INTERFACE
 * App
 * Minimalist Todo app with Supabase authentication and per-user todo CRUD.
 */
function App() {
  // Auth state
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI/UX state
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [status, setStatus] = useState('');

  // Todo state
  const [todos, setTodos] = useState([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [todoLoading, setTodoLoading] = useState(false);

  // Derived user id
  const userId = useMemo(() => (session?.user?.id ?? null), [session]);

  // Initialize auth session and listener
  useEffect(() => {
    let mounted = true;
    const client = getSupabaseClient();

    // Fetch current session
    client.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session ?? null);
    });

    // Subscribe to auth changes
    const { data: authListener } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  // Fetch todos for the logged-in user
  const fetchTodos = useCallback(async () => {
    if (!userId) return;
    setTodoLoading(true);
    setStatus('Loading todos...');
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos(Array.isArray(data) ? data : []);
      setStatus('');
    } catch (err) {
      setStatus('Failed to load todos.');
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setTodoLoading(false);
    }
  }, [userId]);

  // Auto fetch todos on login
  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  // PUBLIC_INTERFACE
  const handleSignup = async (e) => {
    /** Sign up via Supabase email/password */
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setStatus('Signing up...');
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.REACT_APP_SITE_URL || window.location.origin
        }
      });
      if (error) throw error;
      setStatus('Check your email for a confirmation link.');
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError(err.message || 'Sign up failed.');
      setStatus('');
    } finally {
      setAuthLoading(false);
    }
  };

  // PUBLIC_INTERFACE
  const handleLogin = async (e) => {
    /** Login via Supabase email/password */
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setStatus('Logging in...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session);
      setStatus('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
      setStatus('');
    } finally {
      setAuthLoading(false);
    }
  };

  // PUBLIC_INTERFACE
  const handleLogout = async () => {
    /** Logout current user */
    setStatus('Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      setStatus('Failed to sign out.');
    } else {
      setStatus('');
      setTodos([]);
    }
  };

  // PUBLIC_INTERFACE
  const addTodo = async (e) => {
    /** Create a new todo for the user */
    e.preventDefault();
    if (!newTodoTitle.trim() || !userId) return;
    setTodoLoading(true);
    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{ title: newTodoTitle.trim(), is_complete: false, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      setTodos((prev) => [data, ...prev]);
      setNewTodoTitle('');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setStatus('Failed to add todo.');
    } finally {
      setTodoLoading(false);
    }
  };

  // PUBLIC_INTERFACE
  const toggleTodo = async (todo) => {
    /** Toggle completion state for a todo */
    const { id, is_complete } = todo;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, is_complete: !is_complete } : t)));
    const { error } = await supabase
      .from('todos')
      .update({ is_complete: !is_complete })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      // revert on error
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, is_complete } : t)));
      setStatus('Failed to update todo.');
    }
  };

  // PUBLIC_INTERFACE
  const editTodo = async (id, newTitle) => {
    /** Edit todo title */
    const title = newTitle.trim();
    if (!title) return;
    const old = todos.find((t) => t.id === id);
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
    const { error } = await supabase
      .from('todos')
      .update({ title })
      .eq('id', id)
      .eq('user_id', userId);
    if (error && old) {
      setTodos((prev) => prev.map((t) => (t.id === id ? old : t)));
      setStatus('Failed to edit todo.');
    }
  };

  // PUBLIC_INTERFACE
  const deleteTodo = async (id) => {
    /** Delete a todo */
    const prev = todos;
    setTodos((cur) => cur.filter((t) => t.id !== id));
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      setTodos(prev);
      setStatus('Failed to delete todo.');
    }
  };

  // Accessible inline edit component
  const TodoItem = ({ todo }) => {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(todo.title);

    const onSubmit = async (e) => {
      e.preventDefault();
      await editTodo(todo.id, title);
      setEditing(false);
    };

    return (
      <li className="todo-item">
        <input
          id={`chk-${todo.id}`}
          type="checkbox"
          checked={!!todo.is_complete}
          onChange={() => toggleTodo(todo)}
          aria-label={`Mark "${todo.title}" as ${todo.is_complete ? 'incomplete' : 'complete'}`}
        />
        <div>
          {editing ? (
            <form onSubmit={onSubmit}>
              <label className="visually-hidden" htmlFor={`edit-${todo.id}`}>Edit todo</label>
              <input
                id={`edit-${todo.id}`}
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditing(false);
                    setTitle(todo.title);
                  }
                }}
                autoFocus
                aria-label="Edit todo title"
              />
            </form>
          ) : (
            <p className={`todo-title ${todo.is_complete ? 'completed' : ''}`}>{todo.title}</p>
          )}
        </div>
        <div className="todo-actions">
          {!editing ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => setEditing(true)}
              aria-label={`Edit "${todo.title}"`}
            >
              Edit
            </button>
          ) : (
            <button
              type="button"
              className="btn success"
              onClick={async () => { await editTodo(todo.id, title); setEditing(false); }}
              aria-label={`Save changes for "${todo.title}"`}
            >
              Save
            </button>
          )}
          <button
            type="button"
            className="btn error"
            onClick={() => deleteTodo(todo.id)}
            aria-label={`Delete "${todo.title}"`}
          >
            Delete
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <div className="brand" aria-label="App title">Things Todo</div>
          <div className="subtitle">Minimalist, personal todos with Supabase</div>
        </div>
      </header>

      <main className="container">
        {/* Auth card */}
        <section className="card" aria-labelledby="auth-heading">
          <h2 id="auth-heading" className="visually-hidden">Authentication</h2>
          {session ? (
            <div className="auth" role="region" aria-label="Signed in">
              <div aria-live="polite" style={{ fontSize: 14, color: 'var(--color-secondary)' }}>
                Signed in as {session.user?.email}
              </div>
              <div>
                <button type="button" className="btn secondary" onClick={handleLogout} aria-label="Sign out">
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="auth" role="form" aria-label="Sign in or sign up">
              <form className="form" onSubmit={handleLogin}>
                <div className="field">
                  <label className="label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    aria-required="true"
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="password">Password</label>
                  <input
                    id="password"
                    className="input"
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    aria-required="true"
                    minLength={6}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" type="submit" disabled={authLoading} aria-label="Log in">
                    {authLoading ? 'Loading...' : 'Log in'}
                  </button>
                  <button className="btn secondary" type="button" onClick={handleSignup} disabled={authLoading} aria-label="Sign up">
                    Sign up
                  </button>
                </div>
                {authError ? (
                  <div role="alert" style={{ color: 'var(--color-error)', fontSize: 14 }}>{authError}</div>
                ) : null}
              </form>
              <div className="divider" aria-hidden="true"><span>or</span></div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-secondary)' }}>
                Use email/password to create an account or log in.
              </p>
            </div>
          )}
        </section>

        {/* Todo app */}
        {session && (
          <section className="todo-app" aria-labelledby="todo-heading">
            <h2 id="todo-heading" className="visually-hidden">Todo List</h2>

            <form className="card todo-input-row" onSubmit={addTodo}>
              <label className="visually-hidden" htmlFor="new-todo">New todo</label>
              <input
                id="new-todo"
                className="input"
                placeholder="What do you need to do?"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                aria-label="New todo title"
              />
              <button className="btn" type="submit" disabled={todoLoading || !newTodoTitle.trim()} aria-label="Add todo">
                Add
              </button>
            </form>

            <div className="card" role="region" aria-label="Your todos">
              {todoLoading && todos.length === 0 ? (
                <div aria-live="polite" style={{ color: 'var(--color-secondary)', fontSize: 14 }}>Loading...</div>
              ) : null}
              {todos.length === 0 && !todoLoading ? (
                <div aria-live="polite" style={{ color: 'var(--color-secondary)', fontSize: 14 }}>
                  No todos yet. Add your first task above.
                </div>
              ) : null}
              <ul className="todo-list">
                {todos.map((t) => (
                  <TodoItem key={t.id} todo={t} />
                ))}
              </ul>
            </div>
          </section>
        )}

        {status ? (
          <div style={{ marginTop: 12, color: 'var(--color-secondary)', fontSize: 14 }} aria-live="polite">
            {status}
          </div>
        ) : null}
      </main>

      <footer className="footer">
        <div className="container">
          <div>Built with Supabase • Ocean Professional</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
