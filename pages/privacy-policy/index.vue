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
                <li>{{ t('privacy_policy.sections.contact.phone') }} <strong>+966537030838</strong></li>
                <li>{{ t('privacy_policy.sections.contact.email') }} <strong>gotawfeer@gmail.com</strong></li>
                <li>{{ t('privacy_policy.sections.contact.response_time') }} <strong>48 {{ t('privacy_policy.sections.contact.work_hours') }}</strong></li>
              </ul>
            </section>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.changes.title') }}</h5>
              <p>{{ t('privacy_policy.sections.changes.content') }}</p>
            </section>

            <section class="mb-3">
              <h5 class="fw-bold">{{ t('privacy_policy.sections.principles.title') }}</h5>
              <p>{{ t('privacy_policy.sections.principles.intro') }}</p>
              <ol>
                <li><strong>{{ t('privacy_policy.sections.principles.responsibility') }}</strong></li>
                <li><strong>{{ t('privacy_policy.sections.principles.transparency') }}</strong></li>
                <li><strong>{{ t('privacy_policy.sections.principles.choice') }}</strong></li>
                <li><strong>{{ t('privacy_policy.sections.principles.limit_collection') }}</strong></li>
                <li><strong>{{ t('privacy_policy.sections.principles.retention') }}</strong></li>
                <li><strong>{{ t('privacy_policy.sections.principles.access') }}</strong></li>
                <li><strong>{{ t('privacy_policy.sections.principles.limit_disclosure') }}</strong></li>
                <li><strong>{{ t('privacy_policy.sections.principles.security') }}</strong></li>
                <li><strong>{{ t('privacy_policy.sections.principles.quality') }}</strong></li>
                <li><strong>{{ t('privacy_policy.sections.principles.monitoring') }}</strong></li>
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