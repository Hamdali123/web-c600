import { redirect } from 'next/navigation';

export default function UsersRedirectPage() {
  redirect('/settings/general?tab=users');
}
