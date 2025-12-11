<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
    <main class="container py-5">
      <div class="row">
        <div class="col-12">
          <article class="card p-4 mb-4">
            <h2 class="section-title">{{ t('privacy_policy.title') }}</h2>
            <hr>
            <p v-html="t('privacy_policy.intro_html')"></p>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.consent.title') }}</h5>
              <p>{{ t('privacy_policy.sections.consent.content') }}</p>
            </section>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.who_collects.title') }}</h5>
              <p>{{ t('privacy_policy.sections.who_collects.content') }}</p>
            </section>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.external_links.title') }}</h5>
              <p>{{ t('privacy_policy.sections.external_links.content') }}</p>
            </section>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.data_collected.title') }}</h5>
              <ol>
                <li><strong>{{ t('privacy_policy.sections.data_collected.cookies.title') }}</strong> {{ t('privacy_policy.sections.data_collected.cookies.content') }}</li>
                <li><strong>{{ t('privacy_policy.sections.data_collected.personal_info.title') }}</strong> {{ t('privacy_policy.sections.data_collected.personal_info.content') }}</li>
                <li><strong>{{ t('privacy_policy.sections.data_collected.location.title') }}</strong> {{ t('privacy_policy.sections.data_collected.location.content') }}</li>
              </ol>
            </section>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.purpose.title') }}</h5>
              <p>{{ t('privacy_policy.sections.purpose.content') }}</p>
            </section>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.secure_transfer.title') }}</h5>
              <p>{{ t('privacy_policy.sections.secure_transfer.content') }}</p>
            </section>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.protection.title') }}</h5>
              <p>{{ t('privacy_policy.sections.protection.content') }}</p>
            </section>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.user_rights.title') }}</h5>
              <p>{{ t('privacy_policy.sections.user_rights.intro') }}</p>
              <ul>
                <li>{{ t('privacy_policy.sections.user_rights.access') }}</li>
                <li>{{ t('privacy_policy.sections.user_rights.copy') }}</li>
                <li>{{ t('privacy_policy.sections.user_rights.review') }}</li>
                <li>{{ t('privacy_policy.sections.user_rights.withdraw') }}</li>
              </ul>
              <p>{{ t('privacy_policy.sections.user_rights.contact_note') }}</p>
            </section>

            <section class="mb-3" id="contact">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.contact.title') }}</h5>
              <p>{{ t('privacy_policy.sections.contact.intro') }}</p>
              <ul>
                <li>{{ t('privacy_policy.sections.contact.phone') }} <strong>00966537030838</strong></li>
                <li>{{ t('privacy_policy.sections.contact.sms') }} <strong>00966537030838</strong></li>
                <li>{{ t('privacy_policy.sections.contact.email') }} <strong>gotawfeer@gmail.com</strong></li>
                <li>{{ t('privacy_policy.sections.contact.response_time') }} <strong>{{ t('privacy_policy.sections.contact.work_hours') }}</strong></li>
              </ul>
            </section>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.changes.title') }}</h5>
              <p>{{ t('privacy_policy.sections.changes.content') }}</p>
            </section>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.principles.title') }}</h5>
              <p>{{ t('privacy_policy.sections.principles.intro') }}</p>
              <h6 class="fw-bold mt-3 mb-2">{{ t('privacy_policy.sections.principles.subtitle') }}</h6>
              <ol>
                <li>{{ t('privacy_policy.sections.principles.responsibility') }}</li>
                <li>{{ t('privacy_policy.sections.principles.transparency') }}</li>
                <li>{{ t('privacy_policy.sections.principles.choice') }}</li>
                <li>{{ t('privacy_policy.sections.principles.limit_collection') }}</li>
                <li>{{ t('privacy_policy.sections.principles.retention') }}</li>
                <li>{{ t('privacy_policy.sections.principles.access') }}</li>
                <li>{{ t('privacy_policy.sections.principles.limit_disclosure') }}</li>
                <li>{{ t('privacy_policy.sections.principles.security') }}</li>
                <li>{{ t('privacy_policy.sections.principles.quality') }}</li>
                <li>{{ t('privacy_policy.sections.principles.monitoring') }}</li>
              </ol>
            </section>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.sharing.title') }}</h5>
              <p>{{ t('privacy_policy.sections.sharing.content') }}</p>
            </section>

          </article>

        </div>
      </div>
    </main>
</template>